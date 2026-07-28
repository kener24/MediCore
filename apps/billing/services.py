from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.admissions.models import PatientVisit
from apps.audit.models import AuditLog
from apps.audit.services import log_audit_event
from apps.billing.models import BillableService, CashMovement, Invoice, InvoiceItem, Payment
from apps.clinics.models import Clinic
from apps.medical_records.models import ClinicalSupplyUsage


def request_idempotency_key(request):
    value = request.headers.get("Idempotency-Key") or request.data.get("idempotency_key")
    value = str(value or "").strip()
    if not value:
        return None
    if len(value) > 100:
        raise ValidationError("La clave de idempotencia no puede superar 100 caracteres.")
    return value


def _visit_charge_source(visit):
    if visit.consultation_id:
        return "consultation", str(visit.consultation_id)
    return "visit", str(visit.id)


def _sync_visit_items(invoice, visit, user):
    if invoice.paid_amount > 0 or invoice.fiscal_status == Invoice.FiscalStatus.ISSUED:
        return

    source_type, source_id = _visit_charge_source(visit)
    if not invoice.items.filter(source_type=source_type, source_id=source_id, active=True).exists():
        service = (
            BillableService.objects.filter(clinic=visit.clinic, active=True)
            .filter(Q(code__iexact="CONSULTA") | Q(name__icontains="consulta"))
            .order_by("id")
            .first()
        )
        InvoiceItem.objects.create(
            invoice=invoice,
            item_type=InvoiceItem.Type.SERVICE if service else InvoiceItem.Type.MANUAL,
            service=service,
            related_consultation=visit.consultation,
            source_type=source_type,
            source_id=source_id,
            description=(service.name if service else visit.reason or "Atencion medica"),
            quantity=Decimal("1.00"),
            unit_price=(service.price if service else Decimal("0.00")),
            tax_type=(
                InvoiceItem.TaxType.TAXED_15
                if service and service.taxable and service.tax_rate == Decimal("15.00")
                else InvoiceItem.TaxType.TAXED_18
                if service and service.taxable and service.tax_rate == Decimal("18.00")
                else InvoiceItem.TaxType.EXEMPT
            ),
            tax_rate=(service.tax_rate if service and service.taxable else Decimal("0.00")),
        )

    consumptions = ClinicalSupplyUsage.objects.select_for_update().filter(
        clinic=visit.clinic,
        patient=visit.patient,
        billable=True,
        invoiced=False,
        active=True,
    ).exclude(status=ClinicalSupplyUsage.Status.CANCELLED)
    if visit.consultation_id:
        consumptions = consumptions.filter(consultation_id=visit.consultation_id)
    else:
        consumptions = consumptions.filter(consultation__isnull=True, applied_at__date=visit.visit_date)
    for consumption in consumptions:
        source_id = str(consumption.id)
        if invoice.items.filter(source_type="clinical_consumption", source_id=source_id).exists():
            continue
        item = InvoiceItem.objects.create(
            invoice=invoice,
            item_type=InvoiceItem.Type.CONSUMPTION,
            related_consumption=consumption,
            source_type="clinical_consumption",
            source_id=source_id,
            description=consumption.description,
            quantity=consumption.quantity,
            unit_price=consumption.unit_price,
        )
        consumption.invoiced = True
        consumption.invoice = invoice
        consumption.invoice_item = item
        consumption.status = ClinicalSupplyUsage.Status.INVOICED
        consumption.save(update_fields=["invoiced", "invoice", "invoice_item", "status", "actualizado_en"])


@transaction.atomic
def get_or_create_visit_invoice(*, visit, user, request=None):
    visit = (
        PatientVisit.objects.select_for_update()
        .select_related("clinic", "patient", "appointment", "consultation", "invoice")
        .get(pk=visit.pk)
    )
    if getattr(user, "clinica_id", None) != visit.clinic_id:
        raise ValidationError("No tienes permiso sobre esta visita.")
    allowed = [
        PatientVisit.Status.WAITING_BILLING,
        PatientVisit.Status.WAITING_PAYMENT,
        PatientVisit.Status.PAID,
        PatientVisit.Status.COMPLETED,
    ]
    if visit.status not in allowed:
        raise ValidationError("La visita debe tener la consulta finalizada y estar pendiente de cobro.")

    invoice = visit.invoice
    linked_existing = False
    if not invoice and visit.consultation_id:
        invoice = (
            Invoice.objects.select_for_update()
            .filter(clinic=visit.clinic, consultation_id=visit.consultation_id)
            .exclude(status=Invoice.Status.ANULADA)
            .order_by("id")
            .first()
        )
        linked_existing = invoice is not None

    created = invoice is None
    if created:
        invoice = Invoice.objects.create(
            clinic=visit.clinic,
            patient=visit.patient,
            appointment=visit.appointment,
            consultation=visit.consultation,
            created_by=user,
            notes=f"Factura generada desde visita {visit.visit_number}",
        )
    else:
        invoice = Invoice.objects.select_for_update().get(pk=invoice.pk)

    _sync_visit_items(invoice, visit, user)
    invoice.refresh_from_db()
    if visit.invoice_id != invoice.id:
        visit.invoice = invoice
    if invoice.balance_due > 0 and visit.status not in [PatientVisit.Status.COMPLETED, PatientVisit.Status.CANCELLED]:
        visit.status = PatientVisit.Status.WAITING_PAYMENT
        visit.billing_started_at = visit.billing_started_at or timezone.now()
    visit.save(update_fields=["invoice", "status", "billing_started_at", "actualizado_en"])

    if created:
        log_audit_event(
            request=request,
            clinic=visit.clinic,
            action=AuditLog.Action.CREATE,
            module=AuditLog.Module.BILLING,
            model_name="Invoice",
            object_id=invoice.id,
            object_repr=invoice.invoice_number,
            description="Factura generada desde visita.",
            new_values={"visit": visit.id, "total": str(invoice.total_amount)},
        )
    elif linked_existing:
        log_audit_event(
            request=request,
            clinic=visit.clinic,
            action=AuditLog.Action.UPDATE,
            module=AuditLog.Module.BILLING,
            model_name="Invoice",
            object_id=invoice.id,
            object_repr=invoice.invoice_number,
            description="Factura existente recuperada y vinculada a visita.",
            new_values={"visit": visit.id},
        )
    return invoice, created


@transaction.atomic
def register_invoice_payment(*, invoice, user, payload, request=None, idempotency_key=None):
    from apps.billing.serializers import PaymentCreateSerializer

    invoice = Invoice.objects.select_for_update().select_related("clinic", "patient").get(pk=invoice.pk)
    if getattr(user, "clinica_id", None) != invoice.clinic_id:
        raise ValidationError("No tienes permiso sobre esta factura.")

    if idempotency_key:
        existing = Payment.objects.select_for_update().filter(clinic=invoice.clinic, idempotency_key=idempotency_key).first()
        if existing:
            if existing.invoice_id != invoice.id:
                raise ValidationError("La clave de idempotencia ya fue usada en otra factura.")
            return existing, False

    data = payload.copy() if hasattr(payload, "copy") else dict(payload)
    data.pop("idempotency_key", None)
    data["invoice"] = invoice.id
    serializer = PaymentCreateSerializer(data=data, context={"request": request})
    serializer.is_valid(raise_exception=True)
    balance_before = invoice.balance_due
    # Serializa la numeracion interna de pagos incluso cuando se cobran
    # facturas distintas de la misma clinica al mismo tiempo.
    Clinic.objects.select_for_update().get(pk=invoice.clinic_id)
    payment = serializer.save(idempotency_key=idempotency_key, balance_before=balance_before)
    invoice.refresh_from_db()
    Payment.objects.filter(pk=payment.pk).update(balance_after=invoice.balance_due)
    payment.balance_after = invoice.balance_due

    if payment.method == Payment.Method.EFECTIVO and payment.cash_session_id:
        CashMovement.objects.create(
            clinic=invoice.clinic,
            cash_session=payment.cash_session,
            payment=payment,
            invoice=invoice,
            movement_type=CashMovement.Type.PAGO,
            amount=payment.amount,
            method=payment.method,
            reference=payment.reference,
            idempotency_key=f"payment:{payment.id}",
            reason=f"Pago de factura {invoice.invoice_number}",
            created_by=user,
        )

    from apps.clinic_flow.services import sync_visit_financial_state

    sync_visit_financial_state(invoice, user=user, request=request)
    return payment, True


@transaction.atomic
def void_payment(*, payment, user, reason, request=None):
    payment = Payment.objects.select_for_update().select_related("invoice", "cash_session").get(pk=payment.pk)
    if getattr(user, "clinica_id", None) != payment.clinic_id:
        raise ValidationError("No tienes permiso sobre este pago.")
    if payment.status == Payment.Status.ANULADO or not payment.active:
        return payment, False
    if payment.cash_session_id and payment.cash_session.status == payment.cash_session.Status.CERRADA:
        raise ValidationError("No puedes anular un pago asociado a una caja cerrada. Registra un ajuste autorizado en una caja abierta.")

    payment.status = Payment.Status.ANULADO
    payment.active = False
    payment.cancelled_by = user
    payment.cancelled_at = timezone.now()
    payment.cancellation_reason = reason
    payment.save(update_fields=["status", "active", "cancelled_by", "cancelled_at", "cancellation_reason"])
    payment.invoice.recalculate()

    original_movement = getattr(payment, "cash_movement", None)
    if original_movement and payment.cash_session_id and not original_movement.reversal_movements.exists():
        CashMovement.objects.create(
            clinic=payment.clinic,
            cash_session=payment.cash_session,
            invoice=payment.invoice,
            reversed_movement=original_movement,
            movement_type=CashMovement.Type.REVERSO,
            amount=payment.amount,
            method=payment.method,
            reference=payment.reference,
            idempotency_key=f"payment-void:{payment.id}",
            reason=f"Anulacion de pago {payment.payment_number}",
            notes=reason,
            created_by=user,
        )

    from apps.clinic_flow.services import sync_visit_financial_state

    payment.invoice.refresh_from_db()
    sync_visit_financial_state(payment.invoice, user=user, request=request)
    return payment, True
