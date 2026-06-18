from datetime import timedelta
from decimal import Decimal
from io import BytesIO

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q, Sum
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import get_role_name
from apps.billing.fiscal_services import cancel_fiscal_invoice, issue_fiscal_invoice
from apps.billing.models import BillableService, CashMovement, CashSession, ClinicFiscalProfile, FiscalDocumentRange, Invoice, InvoiceItem, Payment
from apps.billing.serializers import (
    BillableServiceSerializer,
    AddConsumptionToInvoiceSerializer,
    AddInventoryItemToInvoiceSerializer,
    BillingStatsSerializer,
    ClinicFiscalProfileSerializer,
    CashMovementSerializer,
    CashSessionCloseSerializer,
    CashSessionDetailSerializer,
    CashSessionListSerializer,
    CashSessionOpenSerializer,
    FiscalCancelSerializer,
    FiscalDocumentRangeSerializer,
    FiscalIssueSerializer,
    InvoiceCreateSerializer,
    InvoiceDetailSerializer,
    InvoiceItemSerializer,
    InvoiceListSerializer,
    InvoiceUpdateSerializer,
    PaymentCreateSerializer,
    PaymentDetailSerializer,
    PaymentListSerializer,
    PaymentVoidSerializer,
)
from apps.medical_records.models import ClinicalSupplyUsage
from apps.medical_records.serializers import ClinicalSupplyUsageSerializer
from apps.clinic_settings.models import get_or_create_clinic_settings
from apps.audit.models import AuditLog
from apps.audit.services import log_audit_event
from apps.notifications.models import Notification
from apps.notifications.services import create_notification


MANAGE_ROLES = ["superadmin", "admin", "recepcionista"]
FISCAL_CONFIG_ROLES = ["superadmin", "admin"]
FISCAL_ISSUE_ROLES = ["admin", "recepcionista"]


def scope(request, queryset):
    role = get_role_name(request.user)
    if role == "superadmin" or request.user.is_superuser:
        clinic = request.query_params.get("clinic")
        return queryset.filter(clinic_id=clinic) if clinic else queryset
    if role in ["admin", "recepcionista", "medico", "enfermera"] and request.user.clinica_id:
        return queryset.filter(clinic_id=request.user.clinica_id)
    if role == "paciente":
        return queryset.filter(patient__user=request.user)
    return queryset.none()


def can_manage_billing(user):
    return get_role_name(user) in MANAGE_ROLES


def can_config_fiscal(user):
    return bool(user.is_superuser or get_role_name(user) in FISCAL_CONFIG_ROLES)


def can_issue_fiscal(user):
    return get_role_name(user) in FISCAL_ISSUE_ROLES


class ClinicFiscalProfileViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def _clinic(self, request):
        if get_role_name(request.user) == "superadmin" or request.user.is_superuser:
            clinic_id = request.query_params.get("clinic")
            if clinic_id:
                from apps.clinics.models import Clinic
                return Clinic.objects.filter(id=clinic_id).first()
        return getattr(request.user, "clinica", None)

    def list(self, request):
        if not can_config_fiscal(request.user):
            return Response({"detail": "No tienes permiso para configurar facturacion fiscal."}, status=status.HTTP_403_FORBIDDEN)
        clinic = self._clinic(request)
        if not clinic:
            return Response({"detail": "No hay clinica disponible."}, status=status.HTTP_404_NOT_FOUND)
        profile, _ = ClinicFiscalProfile.objects.get_or_create(clinic=clinic, defaults={"legal_name": clinic.nombre, "rtn": getattr(clinic, "rtn", "") or "", "address": getattr(clinic, "direccion", "") or ""})
        return Response(ClinicFiscalProfileSerializer(profile).data)

    def partial_update(self, request):
        if not can_config_fiscal(request.user):
            return Response({"detail": "No tienes permiso para configurar facturacion fiscal."}, status=status.HTTP_403_FORBIDDEN)
        clinic = self._clinic(request)
        if not clinic:
            return Response({"detail": "No hay clinica disponible."}, status=status.HTTP_404_NOT_FOUND)
        profile, created = ClinicFiscalProfile.objects.get_or_create(clinic=clinic, defaults={"legal_name": clinic.nombre, "rtn": getattr(clinic, "rtn", "") or "", "address": getattr(clinic, "direccion", "") or ""})
        serializer = ClinicFiscalProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        profile = serializer.save()
        log_audit_event(request=request, clinic=clinic, action=AuditLog.Action.CREATE if created else AuditLog.Action.SETTINGS_CHANGE, module=AuditLog.Module.BILLING, model_name="ClinicFiscalProfile", object_id=profile.id, object_repr=profile.legal_name, description="Perfil fiscal de clinica actualizado.", new_values=serializer.validated_data)
        return Response(ClinicFiscalProfileSerializer(profile).data)


class FiscalDocumentRangeViewSet(viewsets.ModelViewSet):
    serializer_class = FiscalDocumentRangeSerializer
    permission_classes = [IsAuthenticated]
    queryset = FiscalDocumentRange.objects.select_related("clinic")

    def get_queryset(self):
        queryset = scope(self.request, super().get_queryset())
        p = self.request.query_params
        if p.get("document_type"):
            queryset = queryset.filter(document_type=p["document_type"])
        if p.get("is_active") is not None:
            queryset = queryset.filter(is_active=p["is_active"].lower() in ["1", "true", "yes", "si"])
        return queryset

    def create(self, request, *args, **kwargs):
        if not can_config_fiscal(request.user):
            return Response({"detail": "No tienes permiso para crear rangos CAI."}, status=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        clinic = request.user.clinica
        if get_role_name(request.user) == "superadmin" and request.data.get("clinic"):
            from apps.clinics.models import Clinic
            clinic = Clinic.objects.filter(id=request.data["clinic"]).first()
        fiscal_range = serializer.save(clinic=clinic)
        log_audit_event(request=request, clinic=clinic, action=AuditLog.Action.CREATE, module=AuditLog.Module.BILLING, model_name="FiscalDocumentRange", object_id=fiscal_range.id, object_repr=fiscal_range.full_start_number, description="Rango fiscal CAI creado.", new_values=serializer.validated_data)
        return Response(FiscalDocumentRangeSerializer(fiscal_range).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        if not can_config_fiscal(request.user):
            return Response({"detail": "No tienes permiso para editar rangos CAI."}, status=status.HTTP_403_FORBIDDEN)
        fiscal_range = self.get_object()
        response = super().partial_update(request, *args, **kwargs)
        log_audit_event(request=request, clinic=fiscal_range.clinic, action=AuditLog.Action.UPDATE, module=AuditLog.Module.BILLING, model_name="FiscalDocumentRange", object_id=fiscal_range.id, object_repr=fiscal_range.full_start_number, description="Rango fiscal CAI actualizado.", new_values=request.data)
        return response


class BillableServiceViewSet(viewsets.ModelViewSet):
    queryset = BillableService.objects.select_related("clinic")
    serializer_class = BillableServiceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = scope(self.request, super().get_queryset())
        if self.request.query_params.get("active") is not None:
            queryset = queryset.filter(active=self.request.query_params["active"].lower() in ["1", "true", "yes", "si"])
        if self.request.query_params.get("search"):
            s = self.request.query_params["search"]
            queryset = queryset.filter(Q(name__icontains=s) | Q(code__icontains=s) | Q(description__icontains=s))
        return queryset

    def create(self, request, *args, **kwargs):
        if not can_manage_billing(request.user):
            return Response({"detail": "No tienes permiso para crear servicios."}, status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if not can_manage_billing(request.user):
            return Response({"detail": "No tienes permiso para editar servicios."}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if not can_manage_billing(request.user):
            return Response({"detail": "No tienes permiso para editar servicios."}, status=status.HTTP_403_FORBIDDEN)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not can_manage_billing(request.user):
            return Response({"detail": "No tienes permiso para desactivar servicios."}, status=status.HTTP_403_FORBIDDEN)
        service = self.get_object()
        service.active = False
        service.save(update_fields=["active"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.select_related("clinic", "patient", "created_by").prefetch_related("items", "payments")
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "list":
            return InvoiceListSerializer
        if self.action == "create":
            return InvoiceCreateSerializer
        if self.action in ["update", "partial_update"]:
            return InvoiceUpdateSerializer
        return InvoiceDetailSerializer

    def get_queryset(self):
        queryset = scope(self.request, super().get_queryset())
        p = self.request.query_params
        today = timezone.localdate()
        if p.get("today", "").lower() in ["1", "true", "yes", "si"]:
            queryset = queryset.filter(issue_date=today)
        if p.get("patient"):
            queryset = queryset.filter(patient_id=p["patient"])
        if p.get("status"):
            queryset = queryset.filter(status=p["status"])
        if p.get("fiscal_status"):
            queryset = queryset.filter(fiscal_status=p["fiscal_status"])
        if p.get("is_fiscal") is not None:
            queryset = queryset.filter(is_fiscal=p["is_fiscal"].lower() in ["1", "true", "yes", "si"])
        if p.get("fiscal_number"):
            queryset = queryset.filter(fiscal_number__icontains=p["fiscal_number"])
        if p.get("invoice_number"):
            queryset = queryset.filter(invoice_number__icontains=p["invoice_number"])
        if p.get("created_by"):
            queryset = queryset.filter(created_by_id=p["created_by"])
        if p.get("appointment"):
            queryset = queryset.filter(appointment_id=p["appointment"])
        if p.get("consultation"):
            queryset = queryset.filter(consultation_id=p["consultation"])
        if p.get("date_from"):
            queryset = queryset.filter(issue_date__gte=p["date_from"])
        if p.get("date_to"):
            queryset = queryset.filter(issue_date__lte=p["date_to"])
        if p.get("has_balance", "").lower() in ["1", "true", "yes", "si"]:
            queryset = queryset.filter(balance_due__gt=0)
        if p.get("has_balance", "").lower() in ["0", "false", "no"]:
            queryset = queryset.filter(balance_due__lte=0)
        if p.get("paid", "").lower() in ["1", "true", "yes", "si"]:
            queryset = queryset.filter(status=Invoice.Status.PAGADA)
        if p.get("pending", "").lower() in ["1", "true", "yes", "si"]:
            queryset = queryset.filter(status__in=[Invoice.Status.PENDIENTE, Invoice.Status.PARCIAL])
        if p.get("voided", "").lower() in ["1", "true", "yes", "si"]:
            queryset = queryset.filter(status=Invoice.Status.ANULADA)
        if p.get("payment_method"):
            queryset = queryset.filter(payments__method=p["payment_method"], payments__active=True, payments__status=Payment.Status.APLICADO)
        if p.get("search"):
            s = p["search"]
            queryset = queryset.filter(Q(invoice_number__icontains=s) | Q(patient__nombre_completo__icontains=s) | Q(patient__identidad__icontains=s) | Q(notes__icontains=s))
        return queryset.distinct()

    def create(self, request, *args, **kwargs):
        if not can_manage_billing(request.user):
            return Response({"detail": "No tienes permiso para crear facturas."}, status=status.HTTP_403_FORBIDDEN)
        serializer = InvoiceCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        invoice = serializer.save()
        invoice = Invoice.objects.select_related("clinic", "patient__user", "created_by").prefetch_related("items", "payments").get(id=invoice.id)
        log_audit_event(request=request, clinic=invoice.clinic, action=AuditLog.Action.CREATE, module=AuditLog.Module.BILLING, model_name="Invoice", object_id=invoice.id, object_repr=invoice.invoice_number, description="Factura creada.", new_values={"total": str(invoice.total_amount), "patient": invoice.patient_id})
        if invoice.patient.user:
            create_notification(invoice.patient.user, "Factura creada", f"Se genero una factura por L {invoice.total_amount}.", clinic=invoice.clinic, notification_type=Notification.Type.INFO, module=Notification.Module.BILLING, priority=Notification.Priority.NORMAL, related_model="Invoice", related_object_id=invoice.id, action_url="/patient/invoices")
        return Response(InvoiceDetailSerializer(invoice).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        invoice = self.get_object()
        if invoice.fiscal_status == Invoice.FiscalStatus.ISSUED:
            return Response({"detail": "No puedes borrar una factura fiscal emitida. Debes anularla fiscalmente."}, status=status.HTTP_400_BAD_REQUEST)
        return self.void(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if not can_manage_billing(request.user):
            return Response({"detail": "No tienes permiso para editar facturas."}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if not can_manage_billing(request.user):
            return Response({"detail": "No tienes permiso para editar facturas."}, status=status.HTTP_403_FORBIDDEN)
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=["patch"])
    def void(self, request, pk=None):
        if not can_manage_billing(request.user):
            return Response({"detail": "No tienes permiso para anular facturas."}, status=status.HTTP_403_FORBIDDEN)
        serializer = PaymentVoidSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invoice = self.get_object()
        if invoice.fiscal_status == Invoice.FiscalStatus.ISSUED:
            return Response({"detail": "No puedes anular por esta via una factura fiscal emitida. Usa cancel-fiscal."}, status=status.HTTP_400_BAD_REQUEST)
        if invoice.status == Invoice.Status.ANULADA:
            return Response({"detail": "La factura ya esta anulada."}, status=status.HTTP_400_BAD_REQUEST)
        if invoice.paid_amount > 0:
            return Response({"detail": "No puedes anular una factura con pagos aplicados. Anula primero los pagos."}, status=status.HTTP_400_BAD_REQUEST)
        invoice.status = Invoice.Status.ANULADA
        invoice.active = False
        invoice.cancelled_by = request.user
        invoice.cancelled_at = timezone.now()
        invoice.cancellation_reason = serializer.validated_data["reason"]
        invoice.save(update_fields=["status", "active", "cancelled_by", "cancelled_at", "cancellation_reason"])
        log_audit_event(request=request, clinic=invoice.clinic, action=AuditLog.Action.VOID, module=AuditLog.Module.BILLING, model_name="Invoice", object_id=invoice.id, object_repr=invoice.invoice_number, description="Factura anulada.", new_values={"reason": invoice.cancellation_reason})
        return Response(InvoiceDetailSerializer(invoice).data)

    @action(detail=True, methods=["patch"])
    def recalculate(self, request, pk=None):
        if not can_manage_billing(request.user):
            return Response({"detail": "No tienes permiso para recalcular facturas."}, status=status.HTTP_403_FORBIDDEN)
        invoice = self.get_object()
        if invoice.fiscal_status == Invoice.FiscalStatus.ISSUED:
            return Response({"detail": "No puedes recalcular una factura fiscal emitida."}, status=status.HTTP_400_BAD_REQUEST)
        invoice.recalculate()
        return Response(InvoiceDetailSerializer(invoice).data)

    @action(detail=True, methods=["get", "post"], url_path="items")
    def items(self, request, pk=None):
        invoice = self.get_object()
        if request.method == "GET":
            return Response(InvoiceItemSerializer(invoice.items.filter(active=True), many=True).data)
        if invoice.fiscal_status == Invoice.FiscalStatus.ISSUED:
            return Response({"detail": "No puedes agregar items a una factura fiscal emitida."}, status=status.HTTP_400_BAD_REQUEST)
        if not can_manage_billing(request.user):
            return Response({"detail": "No tienes permiso para agregar items."}, status=status.HTTP_403_FORBIDDEN)
        serializer = InvoiceItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(invoice=invoice)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="payments")
    def payments(self, request, pk=None):
        invoice = self.get_object()
        if invoice.fiscal_status == Invoice.FiscalStatus.ISSUED:
            return Response({"detail": "No puedes modificar una factura fiscal emitida."}, status=status.HTTP_400_BAD_REQUEST)
        queryset = invoice.payments.filter(active=True)
        return Response(PaymentListSerializer(queryset, many=True).data)

    @action(detail=True, methods=["post"], url_path="add-consumption")
    def add_consumption(self, request, pk=None):
        if not can_manage_billing(request.user):
            return Response({"detail": "No tienes permiso para agregar consumos a facturas."}, status=status.HTTP_403_FORBIDDEN)
        invoice = self.get_object()
        if invoice.fiscal_status == Invoice.FiscalStatus.ISSUED:
            return Response({"detail": "No puedes modificar una factura fiscal emitida."}, status=status.HTTP_400_BAD_REQUEST)
        if invoice.status in [Invoice.Status.PAGADA, Invoice.Status.ANULADA]:
            return Response({"detail": "No puedes modificar una factura pagada o anulada."}, status=status.HTTP_400_BAD_REQUEST)
        serializer = AddConsumptionToInvoiceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        consumption = serializer.validated_data["consumption"]
        if consumption.clinic_id != invoice.clinic_id or consumption.patient_id != invoice.patient_id:
            return Response({"detail": "El consumo debe pertenecer al mismo paciente y clinica."}, status=status.HTTP_400_BAD_REQUEST)
        item = InvoiceItem.objects.create(
            invoice=invoice,
            item_type=InvoiceItem.Type.CONSUMPTION,
            inventory_item=consumption.inventory_item,
            inventory_lot=consumption.inventory_lot,
            related_consultation=consumption.consultation,
            related_consumption=consumption,
            description=consumption.description,
            quantity=consumption.quantity,
            unit_price=consumption.unit_price,
        )
        consumption.invoiced = True
        consumption.invoice = invoice
        consumption.invoice_item = item
        consumption.status = ClinicalSupplyUsage.Status.INVOICED
        consumption.save(update_fields=["invoiced", "invoice", "invoice_item", "status", "actualizado_en"])
        log_audit_event(request=request, clinic=invoice.clinic, action=AuditLog.Action.UPDATE, module=AuditLog.Module.BILLING, model_name="Invoice", object_id=invoice.id, object_repr=invoice.invoice_number, description="Consumo clinico agregado a factura.", new_values={"consumption": consumption.id, "invoice_item": item.id})
        return Response(InvoiceItemSerializer(item).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="add-inventory-item")
    def add_inventory_item(self, request, pk=None):
        if not can_manage_billing(request.user):
            return Response({"detail": "No tienes permiso para agregar productos a facturas."}, status=status.HTTP_403_FORBIDDEN)
        invoice = self.get_object()
        if invoice.status in [Invoice.Status.PAGADA, Invoice.Status.ANULADA]:
            return Response({"detail": "No puedes modificar una factura pagada o anulada."}, status=status.HTTP_400_BAD_REQUEST)
        serializer = AddInventoryItemToInvoiceSerializer(data=request.data, context={"invoice": invoice})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            from apps.inventory.models import InventoryMovement

            movement = InventoryMovement.objects.create(
                clinic=invoice.clinic,
                item=data["inventory_item"],
                lot=data.get("inventory_lot"),
                movement_type=InventoryMovement.Type.SALIDA,
                quantity=data["quantity"],
                unit_cost=data["inventory_item"].cost_price,
                reason="invoice_sale",
                reference_type="invoice",
                reference_id=str(invoice.id),
                notes=f"Factura {invoice.invoice_number}",
                performed_by=request.user,
            )
            item = InvoiceItem.objects.create(
                invoice=invoice,
                item_type=data.get("item_type", InvoiceItem.Type.INVENTORY_ITEM),
                inventory_item=data["inventory_item"],
                inventory_lot=data.get("inventory_lot"),
                inventory_movement=movement,
                description=data.get("description") or data["inventory_item"].name,
                quantity=data["quantity"],
                unit_price=data.get("unit_price") or data["inventory_item"].sale_price,
            )
        except DjangoValidationError as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        log_audit_event(request=request, clinic=invoice.clinic, action=AuditLog.Action.STOCK_OUT, module=AuditLog.Module.INVENTORY, model_name="InvoiceItem", object_id=item.id, object_repr=item.description, description="Producto facturado directo.", new_values={"inventory_item": item.inventory_item_id, "quantity": str(item.quantity), "invoice": invoice.id})
        return Response(InvoiceItemSerializer(item).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["patch", "delete"], url_path=r"items/(?P<item_id>[^/.]+)")
    def item_detail(self, request, pk=None, item_id=None):
        invoice = self.get_object()
        if not can_manage_billing(request.user):
            return Response({"detail": "No tienes permiso para modificar items."}, status=status.HTTP_403_FORBIDDEN)
        if invoice.fiscal_status == Invoice.FiscalStatus.ISSUED:
            return Response({"detail": "No puedes modificar items de una factura fiscal emitida."}, status=status.HTTP_400_BAD_REQUEST)
        item = invoice.items.filter(id=item_id).first()
        if not item:
            return Response({"detail": "Item no encontrado."}, status=status.HTTP_404_NOT_FOUND)
        if request.method == "DELETE":
            item.active = False
            item.save(update_fields=["active"])
            invoice.recalculate()
            return Response(status=status.HTTP_204_NO_CONTENT)
        serializer = InvoiceItemSerializer(item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="my-invoices")
    def my_invoices(self, request):
        if get_role_name(request.user) != "paciente":
            return Response({"detail": "Solo disponible para pacientes."}, status=status.HTTP_403_FORBIDDEN)
        return Response(InvoiceListSerializer(self.get_queryset(), many=True).data)

    @action(detail=False, methods=["get"], url_path="today-summary")
    def today_summary(self, request):
        day = timezone.localdate()
        invoices = self.get_queryset().filter(issue_date=day)
        data = {
            "date": day,
            "total_invoices": invoices.count(),
            "total_invoiced": invoices.aggregate(v=Sum("total_amount"))["v"] or Decimal("0.00"),
            "total_paid": invoices.aggregate(v=Sum("paid_amount"))["v"] or Decimal("0.00"),
            "total_balance": invoices.aggregate(v=Sum("balance_due"))["v"] or Decimal("0.00"),
            "paid_count": invoices.filter(status=Invoice.Status.PAGADA).count(),
            "pending_count": invoices.filter(status__in=[Invoice.Status.PENDIENTE, Invoice.Status.PARCIAL]).count(),
            "void_count": invoices.filter(status=Invoice.Status.ANULADA).count(),
        }
        return Response(data)

    @action(detail=False, methods=["get"], url_path="pending-consumptions")
    def pending_consumptions(self, request):
        queryset = ClinicalSupplyUsage.objects.select_related("clinic", "patient", "consultation", "doctor__user", "inventory_item", "inventory_lot", "applied_by")
        queryset = scope(request, queryset).filter(active=True, billable=True, invoiced=False).exclude(status=ClinicalSupplyUsage.Status.CANCELLED)
        p = request.query_params
        if p.get("patient"):
            queryset = queryset.filter(patient_id=p["patient"])
        if p.get("consultation"):
            queryset = queryset.filter(consultation_id=p["consultation"])
        if p.get("date_from"):
            queryset = queryset.filter(applied_at__date__gte=p["date_from"])
        if p.get("date_to"):
            queryset = queryset.filter(applied_at__date__lte=p["date_to"])
        return Response(ClinicalSupplyUsageSerializer(queryset, many=True).data)

    @action(detail=True, methods=["get"], url_path="print-data")
    def print_data(self, request, pk=None):
        invoice = self.get_object()
        settings = get_or_create_clinic_settings(invoice.clinic)
        clinic = invoice.clinic
        patient = invoice.patient
        data = {
            "clinic": {
                "id": clinic.id,
                "name": clinic.nombre,
                "logo_url": settings.logo_url,
                "fiscal_name": settings.fiscal_name or clinic.nombre,
                "rtn": settings.fiscal_rtn or clinic.rtn,
                "address": settings.fiscal_address or clinic.direccion,
                "phone": settings.fiscal_phone or clinic.telefono,
                "email": settings.fiscal_email or clinic.correo,
                "primary_color": settings.primary_color,
                "currency": settings.currency,
            },
            "invoice": {
                "id": invoice.id,
                "number": invoice.invoice_number,
                "issue_date": invoice.issue_date,
                "due_date": invoice.due_date,
                "status": invoice.status,
                "subtotal": invoice.subtotal,
                "discount": invoice.discount_amount,
                "tax": invoice.tax_amount,
                "total": invoice.total_amount,
                "paid": invoice.paid_amount,
                "balance": invoice.balance_due,
                "notes": invoice.notes,
                "is_fiscal": invoice.is_fiscal,
                "fiscal_status": invoice.fiscal_status,
                "fiscal_number": invoice.fiscal_number,
                "cai": invoice.cai,
                "fiscal_range_start": invoice.fiscal_range_start,
                "fiscal_range_end": invoice.fiscal_range_end,
                "fiscal_expiration_date": invoice.fiscal_expiration_date,
                "subtotal_exempt": invoice.subtotal_exempt,
                "subtotal_exonerated": invoice.subtotal_exonerated,
                "subtotal_taxed_15": invoice.subtotal_taxed_15,
                "subtotal_taxed_18": invoice.subtotal_taxed_18,
                "isv_15": invoice.isv_15,
                "isv_18": invoice.isv_18,
                "amount_in_words": invoice.amount_in_words,
            },
            "patient": {
                "id": patient.id,
                "full_name": patient.nombre_completo,
                "identity": patient.identidad,
                "phone": patient.telefono,
                "email": patient.correo,
            },
            "items": InvoiceItemSerializer(invoice.items.filter(active=True), many=True).data,
            "payments": PaymentListSerializer(invoice.payments.filter(active=True), many=True).data,
            "footer_text": settings.footer_invoice_text,
            "terms": settings.terms_and_conditions,
        }
        log_audit_event(request=request, clinic=invoice.clinic, action=AuditLog.Action.PRINT, module=AuditLog.Module.BILLING, model_name="Invoice", object_id=invoice.id, object_repr=invoice.invoice_number, description="Datos de impresion de factura consultados.")
        return Response(data)

    @action(detail=True, methods=["post"], url_path="issue-fiscal")
    def issue_fiscal(self, request, pk=None):
        if not can_issue_fiscal(request.user):
            return Response({"detail": "No tienes permiso para emitir facturas fiscales."}, status=status.HTTP_403_FORBIDDEN)
        serializer = FiscalIssueSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        invoice = self.get_object()
        try:
            invoice = issue_fiscal_invoice(invoice, request.user)
        except DjangoValidationError as exc:
            message = exc.messages[0]
            severity = AuditLog.Severity.WARNING
            log_audit_event(request=request, clinic=invoice.clinic, action=AuditLog.Action.INVOICE, module=AuditLog.Module.BILLING, model_name="Invoice", object_id=invoice.id, object_repr=invoice.invoice_number, description=f"Error al emitir factura fiscal: {message}", status=AuditLog.Status.FAILED, severity=severity)
            return Response({"detail": message}, status=status.HTTP_400_BAD_REQUEST)
        log_audit_event(request=request, clinic=invoice.clinic, action=AuditLog.Action.INVOICE, module=AuditLog.Module.BILLING, model_name="Invoice", object_id=invoice.id, object_repr=invoice.fiscal_number, description="Factura fiscal emitida.", new_values={"fiscal_number": invoice.fiscal_number, "cai": invoice.cai, "total": str(invoice.total_amount)})
        return Response(InvoiceDetailSerializer(invoice).data)

    @action(detail=True, methods=["post"], url_path="cancel-fiscal")
    def cancel_fiscal(self, request, pk=None):
        if not can_issue_fiscal(request.user):
            return Response({"detail": "No tienes permiso para anular facturas fiscales."}, status=status.HTTP_403_FORBIDDEN)
        serializer = FiscalCancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invoice = self.get_object()
        try:
            invoice = cancel_fiscal_invoice(invoice, request.user, serializer.validated_data["reason"])
        except DjangoValidationError as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        log_audit_event(request=request, clinic=invoice.clinic, action=AuditLog.Action.CANCEL, module=AuditLog.Module.BILLING, model_name="Invoice", object_id=invoice.id, object_repr=invoice.fiscal_number, description="Factura fiscal anulada.", new_values={"reason": invoice.cancellation_reason})
        return Response(InvoiceDetailSerializer(invoice).data)

    @action(detail=True, methods=["get"], url_path="fiscal-print-data")
    def fiscal_print_data(self, request, pk=None):
        invoice = self.get_object()
        if invoice.fiscal_status != Invoice.FiscalStatus.ISSUED and invoice.fiscal_status != Invoice.FiscalStatus.CANCELLED:
            return Response({"detail": "La factura no esta emitida fiscalmente."}, status=status.HTTP_400_BAD_REQUEST)
        response = self.print_data(request, pk)
        response.data["fiscal"] = {
            "number": invoice.fiscal_number,
            "cai": invoice.cai,
            "range_start": invoice.fiscal_range_start,
            "range_end": invoice.fiscal_range_end,
            "expiration_date": invoice.fiscal_expiration_date,
            "emitter_rtn": invoice.emitter_rtn,
            "emitter_legal_name": invoice.emitter_legal_name,
            "emitter_commercial_name": invoice.emitter_commercial_name,
            "emitter_address": invoice.emitter_address,
            "customer_name": invoice.customer_name,
            "customer_rtn": invoice.customer_rtn,
            "customer_address": invoice.customer_address,
        }
        return response

    @action(detail=True, methods=["get"], url_path="fiscal-pdf")
    def fiscal_pdf(self, request, pk=None):
        invoice = self.get_object()
        if invoice.fiscal_status != Invoice.FiscalStatus.ISSUED and invoice.fiscal_status != Invoice.FiscalStatus.CANCELLED:
            return Response({"detail": "No se puede generar PDF fiscal de una factura no emitida."}, status=status.HTTP_400_BAD_REQUEST)
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table as PdfTable

        stream = BytesIO()
        doc = SimpleDocTemplate(stream, pagesize=letter, rightMargin=32, leftMargin=32, topMargin=32, bottomMargin=32)
        styles = getSampleStyleSheet()
        story = [
            Paragraph(invoice.emitter_legal_name, styles["Title"]),
            Paragraph(f"RTN: {invoice.emitter_rtn}", styles["Normal"]),
            Paragraph(invoice.emitter_address, styles["Normal"]),
            Spacer(1, 8),
            Paragraph(f"FACTURA FISCAL: {invoice.fiscal_number}", styles["Heading2"]),
            Paragraph(f"CAI: {invoice.cai}", styles["Normal"]),
            Paragraph(f"Rango autorizado: {invoice.fiscal_range_start} a {invoice.fiscal_range_end}", styles["Normal"]),
            Paragraph(f"Fecha limite de emision: {invoice.fiscal_expiration_date}", styles["Normal"]),
            Spacer(1, 8),
            Paragraph(f"Cliente: {invoice.customer_name}", styles["Normal"]),
            Paragraph(f"RTN cliente: {invoice.customer_rtn or '-'}", styles["Normal"]),
        ]
        rows = [["Cant.", "Descripcion", "Precio", "Desc.", "ISV", "Total"]]
        for item in invoice.items.filter(active=True):
            rows.append([str(item.quantity), item.description, str(item.unit_price), str(item.discount_amount), str(item.tax_amount), str(item.line_total)])
        story.extend([Spacer(1, 10), PdfTable(rows), Spacer(1, 10)])
        totals = [
            ["Importe exento", invoice.subtotal_exempt],
            ["Importe exonerado", invoice.subtotal_exonerated],
            ["Importe gravado 15%", invoice.subtotal_taxed_15],
            ["Importe gravado 18%", invoice.subtotal_taxed_18],
            ["ISV 15%", invoice.isv_15],
            ["ISV 18%", invoice.isv_18],
            ["Total", invoice.total_amount],
        ]
        story.append(PdfTable([[label, f"L {value}"] for label, value in totals]))
        story.append(Spacer(1, 8))
        story.append(Paragraph(invoice.amount_in_words or "", styles["Normal"]))
        doc.build(story)
        log_audit_event(request=request, clinic=invoice.clinic, action=AuditLog.Action.DOWNLOAD, module=AuditLog.Module.BILLING, model_name="Invoice", object_id=invoice.id, object_repr=invoice.fiscal_number, description="PDF fiscal de factura descargado.")
        response = HttpResponse(stream.getvalue(), content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="factura-fiscal-{invoice.fiscal_number}.pdf"'
        return response

    @action(detail=True, methods=["get"], url_path="pdf")
    def pdf(self, request, pk=None):
        invoice = self.get_object()
        log_audit_event(request=request, clinic=invoice.clinic, action=AuditLog.Action.DOWNLOAD, module=AuditLog.Module.BILLING, model_name="Invoice", object_id=invoice.id, object_repr=invoice.invoice_number, description="PDF de factura solicitado.")
        return Response({"detail": "La descarga PDF de factura aun no esta configurada."}, status=status.HTTP_501_NOT_IMPLEMENTED)


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.select_related("clinic", "invoice", "patient", "received_by", "cash_session")
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "create":
            return PaymentCreateSerializer
        return PaymentDetailSerializer if self.action == "retrieve" else PaymentListSerializer

    def get_queryset(self):
        queryset = scope(self.request, super().get_queryset())
        p = self.request.query_params
        for param, field in [("invoice", "invoice_id"), ("patient", "patient_id"), ("method", "method")]:
            if p.get(param):
                queryset = queryset.filter(**{field: p[param]})
        if p.get("date_from"):
            queryset = queryset.filter(payment_date__gte=p["date_from"])
        if p.get("date_to"):
            queryset = queryset.filter(payment_date__lte=p["date_to"])
        return queryset

    def update(self, request, *args, **kwargs):
        return Response({"detail": "Los pagos no se editan; se anulan."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def destroy(self, request, *args, **kwargs):
        return Response({"detail": "Los pagos no se eliminan; se anulan."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def create(self, request, *args, **kwargs):
        if not can_manage_billing(request.user):
            return Response({"detail": "No tienes permiso para registrar pagos."}, status=status.HTTP_403_FORBIDDEN)
        serializer = PaymentCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        try:
            payment = serializer.save()
        except DjangoValidationError as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        log_audit_event(request=request, clinic=payment.clinic, action=AuditLog.Action.PAYMENT, module=AuditLog.Module.PAYMENTS, model_name="Payment", object_id=payment.id, object_repr=payment.payment_number, description="Pago registrado.", new_values={"amount": str(payment.amount), "method": payment.method, "invoice": payment.invoice_id})
        if payment.patient.user:
            create_notification(payment.patient.user, "Pago registrado", f"Se registro un pago por L {payment.amount}.", clinic=payment.clinic, notification_type=Notification.Type.SUCCESS, module=Notification.Module.PAYMENTS, priority=Notification.Priority.NORMAL, related_model="Payment", related_object_id=payment.id, action_url="/patient/payments")
        return Response(PaymentDetailSerializer(payment).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["patch"])
    def void(self, request, pk=None):
        if not can_manage_billing(request.user):
            return Response({"detail": "No tienes permiso para anular pagos."}, status=status.HTTP_403_FORBIDDEN)
        payment = self.get_object()
        serializer = PaymentVoidSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment.status = Payment.Status.ANULADO
        payment.active = False
        payment.cancelled_by = request.user
        payment.cancelled_at = timezone.now()
        payment.cancellation_reason = serializer.validated_data.get("reason", "")
        payment.save(update_fields=["status", "active", "cancelled_by", "cancelled_at", "cancellation_reason"])
        payment.invoice.recalculate()
        log_audit_event(request=request, clinic=payment.clinic, action=AuditLog.Action.VOID, module=AuditLog.Module.PAYMENTS, model_name="Payment", object_id=payment.id, object_repr=payment.payment_number, description="Pago anulado.", new_values={"reason": payment.cancellation_reason})
        return Response(PaymentDetailSerializer(payment).data)

    @action(detail=False, methods=["get"], url_path="my-payments")
    def my_payments(self, request):
        if get_role_name(request.user) != "paciente":
            return Response({"detail": "Solo disponible para pacientes."}, status=status.HTTP_403_FORBIDDEN)
        return Response(PaymentListSerializer(self.get_queryset(), many=True).data)


class CashSessionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CashSession.objects.select_related("clinic", "opened_by", "closed_by").prefetch_related("movements")
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        return CashSessionDetailSerializer if self.action == "retrieve" else CashSessionListSerializer

    def get_queryset(self):
        return scope(self.request, super().get_queryset())

    @action(detail=False, methods=["post"])
    def open(self, request):
        if not can_manage_billing(request.user):
            return Response({"detail": "No tienes permiso para abrir caja."}, status=status.HTTP_403_FORBIDDEN)
        serializer = CashSessionOpenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            session = CashSession.objects.create(clinic=request.user.clinica, opened_by=request.user, **serializer.validated_data)
        except DjangoValidationError as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        log_audit_event(request=request, clinic=session.clinic, action=AuditLog.Action.CREATE, module=AuditLog.Module.CASH, model_name="CashSession", object_id=session.id, object_repr=f"Caja {session.id}", description="Caja abierta.", new_values=serializer.validated_data)
        return Response(CashSessionDetailSerializer(session).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"])
    def current(self, request):
        session = self.get_queryset().filter(opened_by=request.user, status=CashSession.Status.ABIERTA).first()
        if not session:
            return Response({"detail": "No tienes caja abierta."}, status=status.HTTP_404_NOT_FOUND)
        return Response(CashSessionDetailSerializer(session).data)

    @action(detail=True, methods=["patch"])
    def close(self, request, pk=None):
        if not can_manage_billing(request.user):
            return Response({"detail": "No tienes permiso para cerrar caja."}, status=status.HTTP_403_FORBIDDEN)
        session = self.get_object()
        serializer = CashSessionCloseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            session.close(request.user, serializer.validated_data["closing_amount"], serializer.validated_data.get("notes", ""))
        except DjangoValidationError as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        log_audit_event(request=request, clinic=session.clinic, action=AuditLog.Action.UPDATE, module=AuditLog.Module.CASH, model_name="CashSession", object_id=session.id, object_repr=f"Caja {session.id}", description="Caja cerrada.", new_values=serializer.validated_data)
        return Response(CashSessionDetailSerializer(session).data)

    @action(detail=True, methods=["get", "post"])
    def movements(self, request, pk=None):
        session = self.get_object()
        if request.method == "GET":
            return Response(CashMovementSerializer(session.movements.filter(active=True), many=True).data)
        if not can_manage_billing(request.user):
            return Response({"detail": "No tienes permiso para registrar movimientos."}, status=status.HTTP_403_FORBIDDEN)
        serializer = CashMovementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            movement = serializer.save(cash_session=session, created_by=request.user)
        except DjangoValidationError as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        log_audit_event(request=request, clinic=movement.clinic, action=AuditLog.Action.CREATE, module=AuditLog.Module.CASH, model_name="CashMovement", object_id=movement.id, object_repr=movement.reason, description="Movimiento de caja registrado.", new_values=serializer.validated_data)
        return Response(CashMovementSerializer(movement).data, status=status.HTTP_201_CREATED)


class BillingStatsViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        invoices = scope(request, Invoice.objects.all())
        payments = scope(request, Payment.objects.filter(active=True, status=Payment.Status.APLICADO))
        today = timezone.localdate()
        data = {
            "total_invoiced": invoices.aggregate(v=Sum("total_amount"))["v"] or Decimal("0.00"),
            "total_paid": invoices.aggregate(v=Sum("paid_amount"))["v"] or Decimal("0.00"),
            "total_pending": invoices.aggregate(v=Sum("balance_due"))["v"] or Decimal("0.00"),
            "pending_invoices": invoices.filter(status=Invoice.Status.PENDIENTE).count(),
            "paid_invoices": invoices.filter(status=Invoice.Status.PAGADA).count(),
            "partial_invoices": invoices.filter(status=Invoice.Status.PARCIAL).count(),
            "voided_invoices": invoices.filter(status=Invoice.Status.ANULADA).count(),
            "today_payments": payments.filter(payment_date=today).aggregate(v=Sum("amount"))["v"] or Decimal("0.00"),
            "cash_today": payments.filter(payment_date=today, method=Payment.Method.EFECTIVO).aggregate(v=Sum("amount"))["v"] or Decimal("0.00"),
            "card_today": payments.filter(payment_date=today, method=Payment.Method.TARJETA).aggregate(v=Sum("amount"))["v"] or Decimal("0.00"),
            "transfer_today": payments.filter(payment_date=today, method=Payment.Method.TRANSFERENCIA).aggregate(v=Sum("amount"))["v"] or Decimal("0.00"),
        }
        return Response(BillingStatsSerializer(data).data)

    @action(detail=False, methods=["get"], url_path="fiscal-summary")
    def fiscal_summary(self, request):
        invoices = scope(request, Invoice.objects.filter(is_fiscal=True))
        ranges = scope(request, FiscalDocumentRange.objects.all())
        p = request.query_params
        if p.get("date_from"):
            invoices = invoices.filter(issue_datetime__date__gte=p["date_from"])
        if p.get("date_to"):
            invoices = invoices.filter(issue_datetime__date__lte=p["date_to"])
        if p.get("fiscal_status"):
            invoices = invoices.filter(fiscal_status=p["fiscal_status"])
        today = timezone.localdate()
        return Response(
            {
                "issued_invoices": invoices.filter(fiscal_status=Invoice.FiscalStatus.ISSUED).count(),
                "cancelled_invoices": invoices.filter(fiscal_status=Invoice.FiscalStatus.CANCELLED).count(),
                "subtotal_taxed_15": invoices.aggregate(v=Sum("subtotal_taxed_15"))["v"] or Decimal("0.00"),
                "subtotal_taxed_18": invoices.aggregate(v=Sum("subtotal_taxed_18"))["v"] or Decimal("0.00"),
                "subtotal_exempt": invoices.aggregate(v=Sum("subtotal_exempt"))["v"] or Decimal("0.00"),
                "subtotal_exonerated": invoices.aggregate(v=Sum("subtotal_exonerated"))["v"] or Decimal("0.00"),
                "isv_15": invoices.aggregate(v=Sum("isv_15"))["v"] or Decimal("0.00"),
                "isv_18": invoices.aggregate(v=Sum("isv_18"))["v"] or Decimal("0.00"),
                "total_fiscal": invoices.aggregate(v=Sum("total_amount"))["v"] or Decimal("0.00"),
                "active_ranges": FiscalDocumentRangeSerializer(ranges.filter(is_active=True), many=True).data,
                "ranges_expiring_soon": FiscalDocumentRangeSerializer(ranges.filter(is_active=True, expiration_date__gte=today, expiration_date__lte=today + timedelta(days=30)), many=True).data,
            }
        )
    FiscalCancelSerializer,
    FiscalDocumentRangeSerializer,
    FiscalIssueSerializer,
