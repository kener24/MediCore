from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Avg, Q, Sum
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import get_role_name
from apps.inventory.models import InventoryItem
from apps.purchases.models import PurchaseOrder, PurchaseOrderItem, PurchaseReceipt, PurchaseReceiptItem, Supplier
from apps.purchases.serializers import (
    ItemPurchaseHistorySerializer,
    PurchaseOrderApproveSerializer,
    PurchaseOrderCancelSerializer,
    PurchaseOrderCreateSerializer,
    PurchaseOrderDetailSerializer,
    PurchaseOrderItemCreateSerializer,
    PurchaseOrderItemSerializer,
    PurchaseOrderItemUpdateSerializer,
    PurchaseOrderListSerializer,
    PurchaseOrderUpdateSerializer,
    PurchaseReceiptDetailSerializer,
    PurchaseReceiptListSerializer,
    PurchaseReceiveSerializer,
    PurchaseStatsSerializer,
    SupplierDetailSerializer,
    SupplierHistorySerializer,
    SupplierListSerializer,
    SupplierSerializer,
    can_approve_purchase_orders,
    can_manage_purchases,
    can_receive_purchase_orders,
    can_view_purchases,
)
from apps.audit.models import AuditLog
from apps.audit.services import log_audit_event
from apps.notifications.models import Notification
from apps.notifications.services import create_notification, notify_clinic_admins


def parse_bool(value):
    return str(value).lower() in ["1", "true", "yes", "si"]


def scope(request, queryset):
    role = get_role_name(request.user)
    if role == "superadmin" or request.user.is_superuser:
        clinic = request.query_params.get("clinic")
        return queryset.filter(clinic_id=clinic) if clinic else queryset
    if can_view_purchases(request.user) and request.user.clinica_id:
        return queryset.filter(clinic_id=request.user.clinica_id)
    return queryset.none()


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.select_related("clinic")
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "list":
            return SupplierListSerializer
        if self.action in ["retrieve", "history"]:
            return SupplierDetailSerializer
        return SupplierSerializer

    def get_queryset(self):
        queryset = scope(self.request, super().get_queryset())
        p = self.request.query_params
        if p.get("search"):
            s = p["search"]
            queryset = queryset.filter(Q(name__icontains=s) | Q(rtn__icontains=s) | Q(contact_name__icontains=s) | Q(phone__icontains=s) | Q(email__icontains=s))
        if p.get("active") is not None:
            queryset = queryset.filter(active=parse_bool(p["active"]))
        return queryset

    def create(self, request, *args, **kwargs):
        if not can_manage_purchases(request.user):
            return Response({"detail": "No tienes permiso para administrar proveedores."}, status=status.HTTP_403_FORBIDDEN)
        response = super().create(request, *args, **kwargs)
        if response.status_code == status.HTTP_201_CREATED:
            log_audit_event(request=request, action=AuditLog.Action.CREATE, module=AuditLog.Module.PURCHASES, model_name="Supplier", object_id=response.data.get("id"), object_repr=response.data.get("name", ""), description="Proveedor creado.", new_values=request.data)
        return response

    def update(self, request, *args, **kwargs):
        if not can_manage_purchases(request.user):
            return Response({"detail": "No tienes permiso para administrar proveedores."}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        supplier = self.get_object()
        supplier.active = False
        supplier.save(update_fields=["active", "actualizado_en"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        supplier = self.get_object()
        orders = supplier.purchase_orders.all()[:20]
        receipts = PurchaseReceipt.objects.filter(purchase_order__supplier=supplier).select_related("purchase_order", "received_by")[:20]
        total = supplier.purchase_orders.exclude(status=PurchaseOrder.Status.CANCELADA).aggregate(total=Sum("total_amount"))["total"] or Decimal("0.00")
        last = supplier.purchase_orders.exclude(status=PurchaseOrder.Status.CANCELADA).order_by("-order_date").first()
        data = {
            "supplier": SupplierDetailSerializer(supplier).data,
            "orders": PurchaseOrderListSerializer(orders, many=True).data,
            "receipts": PurchaseReceiptListSerializer(receipts, many=True).data,
            "total_purchased": total,
            "last_purchase": last.order_date if last else None,
        }
        return Response(SupplierHistorySerializer(data).data)


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.select_related("clinic", "supplier", "created_by", "approved_by", "cancelled_by").prefetch_related("items", "receipts")
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "list":
            return PurchaseOrderListSerializer
        if self.action == "create":
            return PurchaseOrderCreateSerializer
        if self.action in ["update", "partial_update"]:
            return PurchaseOrderUpdateSerializer
        return PurchaseOrderDetailSerializer

    def get_queryset(self):
        queryset = scope(self.request, super().get_queryset())
        p = self.request.query_params
        if p.get("supplier"):
            queryset = queryset.filter(supplier_id=p["supplier"])
        if p.get("status"):
            queryset = queryset.filter(status=p["status"])
        if p.get("date_from"):
            queryset = queryset.filter(order_date__gte=p["date_from"])
        if p.get("date_to"):
            queryset = queryset.filter(order_date__lte=p["date_to"])
        if p.get("search"):
            s = p["search"]
            queryset = queryset.filter(Q(order_number__icontains=s) | Q(supplier__name__icontains=s) | Q(notes__icontains=s))
        return queryset

    def create(self, request, *args, **kwargs):
        if not can_manage_purchases(request.user):
            return Response({"detail": "No tienes permiso para crear ordenes de compra."}, status=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            order = serializer.save()
        except DjangoValidationError as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        log_audit_event(request=request, clinic=order.clinic, action=AuditLog.Action.CREATE, module=AuditLog.Module.PURCHASES, model_name="PurchaseOrder", object_id=order.id, object_repr=order.order_number, description="Orden de compra creada.", new_values=request.data)
        return Response(PurchaseOrderDetailSerializer(order).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        order = self.get_object()
        order.status = PurchaseOrder.Status.CANCELADA
        order.active = False
        order.cancelled_by = request.user
        order.cancelled_at = timezone.now()
        order.cancellation_reason = "Cancelada desde API"
        order.save(update_fields=["status", "active", "cancelled_by", "cancelled_at", "cancellation_reason", "actualizado_en"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["patch"])
    def approve(self, request, pk=None):
        if not can_approve_purchase_orders(request.user):
            return Response({"detail": "No tienes permiso para aprobar compras."}, status=status.HTTP_403_FORBIDDEN)
        order = self.get_object()
        if order.status == PurchaseOrder.Status.CANCELADA:
            return Response({"detail": "No puedes aprobar una orden cancelada."}, status=status.HTTP_400_BAD_REQUEST)
        PurchaseOrderApproveSerializer(data=request.data).is_valid(raise_exception=True)
        order.status = PurchaseOrder.Status.APROBADA
        order.approved_by = request.user
        order.approved_at = timezone.now()
        order.save(update_fields=["status", "approved_by", "approved_at", "actualizado_en"])
        log_audit_event(request=request, clinic=order.clinic, action=AuditLog.Action.APPROVE, module=AuditLog.Module.PURCHASES, model_name="PurchaseOrder", object_id=order.id, object_repr=order.order_number, description="Orden de compra aprobada.")
        if order.created_by:
            create_notification(order.created_by, "Orden de compra aprobada", f"La orden {order.order_number} fue aprobada.", clinic=order.clinic, notification_type=Notification.Type.SUCCESS, module=Notification.Module.PURCHASES, priority=Notification.Priority.NORMAL, related_model="PurchaseOrder", related_object_id=order.id, action_url=f"/clinic/purchases/orders/{order.id}")
        return Response(PurchaseOrderDetailSerializer(order).data)

    @action(detail=True, methods=["patch"])
    def cancel(self, request, pk=None):
        serializer = PurchaseOrderCancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = self.get_object()
        if order.status == PurchaseOrder.Status.RECIBIDA:
            return Response({"detail": "No puedes cancelar una orden recibida."}, status=status.HTTP_400_BAD_REQUEST)
        order.status = PurchaseOrder.Status.CANCELADA
        order.active = False
        order.cancelled_by = request.user
        order.cancelled_at = timezone.now()
        order.cancellation_reason = serializer.validated_data["reason"]
        order.save(update_fields=["status", "active", "cancelled_by", "cancelled_at", "cancellation_reason", "actualizado_en"])
        log_audit_event(request=request, clinic=order.clinic, action=AuditLog.Action.CANCEL, module=AuditLog.Module.PURCHASES, model_name="PurchaseOrder", object_id=order.id, object_repr=order.order_number, description="Orden de compra cancelada.", new_values=serializer.validated_data)
        return Response(PurchaseOrderDetailSerializer(order).data)

    @action(detail=True, methods=["patch"])
    def recalculate(self, request, pk=None):
        order = self.get_object()
        order.recalculate()
        return Response(PurchaseOrderDetailSerializer(order).data)

    @action(detail=True, methods=["get", "post"])
    def items(self, request, pk=None):
        order = self.get_object()
        if request.method == "GET":
            return Response(PurchaseOrderItemSerializer(order.items.filter(active=True), many=True).data)
        if not can_manage_purchases(request.user):
            return Response({"detail": "No tienes permiso para editar compras."}, status=status.HTTP_403_FORBIDDEN)
        serializer = PurchaseOrderItemCreateSerializer(data=request.data, context={"purchase_order": order})
        serializer.is_valid(raise_exception=True)
        item = serializer.save()
        return Response(PurchaseOrderItemSerializer(item).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["patch", "delete"], url_path=r"items/(?P<item_id>[^/.]+)")
    def item_detail(self, request, pk=None, item_id=None):
        order = self.get_object()
        item = order.items.get(pk=item_id)
        if request.method == "DELETE":
            item.active = False
            item.save(update_fields=["active", "actualizado_en"])
            order.recalculate()
            return Response(status=status.HTTP_204_NO_CONTENT)
        serializer = PurchaseOrderItemUpdateSerializer(item, data=request.data, partial=True, context={"purchase_order": order})
        serializer.is_valid(raise_exception=True)
        item = serializer.save()
        return Response(PurchaseOrderItemSerializer(item).data)

    @action(detail=True, methods=["post"])
    def receive(self, request, pk=None):
        if not can_receive_purchase_orders(request.user):
            return Response({"detail": "No tienes permiso para recibir compras."}, status=status.HTTP_403_FORBIDDEN)
        order = self.get_object()
        serializer = PurchaseReceiveSerializer(data=request.data, context={"request": request, "purchase_order": order})
        serializer.is_valid(raise_exception=True)
        try:
            receipt = serializer.save()
        except DjangoValidationError as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        log_audit_event(request=request, clinic=receipt.clinic, action=AuditLog.Action.PURCHASE_RECEIVE, module=AuditLog.Module.PURCHASES, model_name="PurchaseReceipt", object_id=receipt.id, object_repr=receipt.receipt_number, description="Recepcion de compra registrada.", new_values=request.data)
        notify_clinic_admins(receipt.clinic, "Compra recibida", f"Se registro la recepcion {receipt.receipt_number}.", module=Notification.Module.PURCHASES, priority=Notification.Priority.NORMAL, notification_type=Notification.Type.SUCCESS, related_model="PurchaseReceipt", related_object_id=receipt.id, action_url=f"/clinic/purchases/receipts/{receipt.id}")
        return Response(PurchaseReceiptDetailSerializer(receipt).data, status=status.HTTP_201_CREATED)


class PurchaseReceiptViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PurchaseReceipt.objects.select_related("clinic", "purchase_order", "purchase_order__supplier", "received_by").prefetch_related("items")
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        return PurchaseReceiptDetailSerializer if self.action == "retrieve" else PurchaseReceiptListSerializer

    def get_queryset(self):
        queryset = scope(self.request, super().get_queryset())
        p = self.request.query_params
        if p.get("order"):
            queryset = queryset.filter(purchase_order_id=p["order"])
        if p.get("supplier"):
            queryset = queryset.filter(purchase_order__supplier_id=p["supplier"])
        if p.get("date_from"):
            queryset = queryset.filter(receipt_date__gte=p["date_from"])
        if p.get("date_to"):
            queryset = queryset.filter(receipt_date__lte=p["date_to"])
        return queryset

    def create(self, request):
        return Response({"detail": "Usa /api/purchases/orders/{id}/receive/ para registrar recepciones."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)


class PurchaseItemHistoryViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def retrieve(self, request, pk=None):
        items = scope(request, InventoryItem.objects.all())
        item = items.filter(pk=pk).first()
        if not item:
            return Response({"detail": "Producto no encontrado."}, status=status.HTTP_404_NOT_FOUND)
        order_items = PurchaseOrderItem.objects.filter(item=item).select_related("purchase_order", "item")
        receipt_items = PurchaseReceiptItem.objects.filter(item=item).select_related("receipt", "purchase_order_item", "item")
        quantity = receipt_items.aggregate(total=Sum("quantity_received"))["total"] or Decimal("0.00")
        avg = receipt_items.aggregate(avg=Avg("unit_cost"))["avg"] or Decimal("0.00")
        data = {
            "item": {"id": item.id, "name": item.name, "sku": item.sku, "stock_current": str(item.stock_current)},
            "orders": PurchaseOrderItemSerializer(order_items, many=True).data,
            "receipts": PurchaseReceiptItemSerializer(receipt_items, many=True).data,
            "quantity_purchased": quantity,
            "average_cost": avg,
        }
        return Response(ItemPurchaseHistorySerializer(data).data)


class PurchaseStatsViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        orders = scope(request, PurchaseOrder.objects.all())
        suppliers = scope(request, Supplier.objects.all())
        today = timezone.localdate()
        first_day = today.replace(day=1)
        data = {
            "total_purchase_orders": orders.count(),
            "draft_orders": orders.filter(status=PurchaseOrder.Status.BORRADOR).count(),
            "pending_orders": orders.filter(status=PurchaseOrder.Status.PENDIENTE).count(),
            "approved_orders": orders.filter(status=PurchaseOrder.Status.APROBADA).count(),
            "partially_received_orders": orders.filter(status=PurchaseOrder.Status.RECIBIDA_PARCIAL).count(),
            "received_orders": orders.filter(status=PurchaseOrder.Status.RECIBIDA).count(),
            "cancelled_orders": orders.filter(status=PurchaseOrder.Status.CANCELADA).count(),
            "total_purchased_amount": orders.exclude(status=PurchaseOrder.Status.CANCELADA).aggregate(total=Sum("total_amount"))["total"] or Decimal("0.00"),
            "purchases_this_month": orders.exclude(status=PurchaseOrder.Status.CANCELADA).filter(order_date__gte=first_day).aggregate(total=Sum("total_amount"))["total"] or Decimal("0.00"),
            "total_suppliers": suppliers.count(),
            "active_suppliers": suppliers.filter(active=True).count(),
        }
        return Response(PurchaseStatsSerializer(data).data)
