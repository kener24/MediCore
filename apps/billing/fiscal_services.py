from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from apps.billing.models import ClinicFiscalProfile, FiscalDocumentRange, Invoice, InvoiceItem, clean_rtn, format_fiscal_number, money


def amount_to_lempiras(value):
    value = Decimal(value or 0).quantize(Decimal("0.01"))
    integer = int(value)
    cents = int((value - integer) * 100)
    units = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE", "DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISEIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE"]
    tens = ["", "", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"]
    hundreds = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"]

    def words(num):
        if num == 0:
            return "CERO"
        if num == 100:
            return "CIEN"
        if num < 20:
            return units[num]
        if num < 30:
            return "VEINTE" if num == 20 else f"VEINTI{units[num - 20].lower()}".upper()
        if num < 100:
            return f"{tens[num // 10]}{f' Y {units[num % 10]}' if num % 10 else ''}"
        if num < 1000:
            return f"{hundreds[num // 100]}{f' {words(num % 100)}' if num % 100 else ''}"
        if num < 1000000:
            thousands = num // 1000
            rest = num % 1000
            return f"{'MIL' if thousands == 1 else f'{words(thousands)} MIL'}{f' {words(rest)}' if rest else ''}"
        return str(num)

    return f"{words(integer)} CON {cents:02d}/100 LEMPIRAS"


def validate_fiscal_profile(profile):
    if not profile or not profile.is_fiscal_billing_enabled:
        raise ValidationError("La clinica no tiene facturacion fiscal habilitada.")
    if not profile.legal_name or not profile.address or len(clean_rtn(profile.rtn)) != 14:
        raise ValidationError("El perfil fiscal de la clinica esta incompleto.")


def get_next_fiscal_number(clinic, document_type=FiscalDocumentRange.DocumentType.INVOICE):
    today = timezone.localdate()
    fiscal_range = (
        FiscalDocumentRange.objects.select_for_update()
        .filter(clinic=clinic, document_type=document_type, is_active=True, is_exhausted=False)
        .order_by("expiration_date", "id")
        .first()
    )
    if not fiscal_range:
        raise ValidationError("No hay un rango fiscal CAI activo para emitir facturas.")
    if fiscal_range.expiration_date < today:
        raise ValidationError("El rango fiscal esta vencido.")
    if fiscal_range.current_number > fiscal_range.end_number:
        fiscal_range.is_exhausted = True
        fiscal_range.is_active = False
        fiscal_range.save(update_fields=["is_exhausted", "is_active", "actualizado_en"])
        raise ValidationError("El rango fiscal esta agotado.")
    number = fiscal_range.current_number
    fiscal_number = format_fiscal_number(fiscal_range.establishment_code, fiscal_range.emission_point_code, fiscal_range.document_type_code, number)
    fiscal_range.current_number += 1
    if number >= fiscal_range.end_number:
        fiscal_range.is_exhausted = True
        fiscal_range.is_active = False
    fiscal_range.save(update_fields=["current_number", "is_exhausted", "is_active", "actualizado_en"])
    return fiscal_range, fiscal_number


def calculate_fiscal_totals(invoice):
    items = invoice.items.filter(active=True)
    subtotal_exempt = Decimal("0.00")
    subtotal_exonerated = Decimal("0.00")
    subtotal_taxed_15 = Decimal("0.00")
    subtotal_taxed_18 = Decimal("0.00")
    isv_15 = Decimal("0.00")
    isv_18 = Decimal("0.00")
    discount = Decimal("0.00")
    subtotal = Decimal("0.00")
    for item in items:
        item.save()
        base = money(item.quantity * item.unit_price)
        line_discount = money(item.discount_amount)
        net = money(max(base - line_discount, Decimal("0.00")))
        subtotal += base
        discount += line_discount
        if item.tax_type == InvoiceItem.TaxType.TAXED_15:
            subtotal_taxed_15 += net
            isv_15 += item.tax_amount
        elif item.tax_type == InvoiceItem.TaxType.TAXED_18:
            subtotal_taxed_18 += net
            isv_18 += item.tax_amount
        elif item.tax_type == InvoiceItem.TaxType.EXONERATED:
            subtotal_exonerated += net
        else:
            subtotal_exempt += net
    total = money(subtotal_exempt + subtotal_exonerated + subtotal_taxed_15 + subtotal_taxed_18 + isv_15 + isv_18)
    return {
        "subtotal": money(subtotal),
        "discount_amount": money(discount),
        "tax_amount": money(isv_15 + isv_18),
        "subtotal_exempt": money(subtotal_exempt),
        "subtotal_exonerated": money(subtotal_exonerated),
        "subtotal_taxed_15": money(subtotal_taxed_15),
        "subtotal_taxed_18": money(subtotal_taxed_18),
        "isv_15": money(isv_15),
        "isv_18": money(isv_18),
        "total_amount": total,
        "total": total,
        "balance_due": money(max(total - (invoice.payments.filter(active=True, status="aplicado").aggregate(total=Sum("amount"))["total"] or Decimal("0.00")), Decimal("0.00"))),
        "amount_in_words": amount_to_lempiras(total),
    }


@transaction.atomic
def issue_fiscal_invoice(invoice, user):
    invoice = Invoice.objects.select_for_update().select_related("clinic", "patient").prefetch_related("items").get(pk=invoice.pk)
    if invoice.fiscal_status == Invoice.FiscalStatus.ISSUED:
        raise ValidationError("La factura fiscal ya fue emitida.")
    if invoice.status == Invoice.Status.ANULADA:
        raise ValidationError("No puedes emitir una factura anulada.")
    if not invoice.items.filter(active=True).exists():
        raise ValidationError("La factura debe tener al menos un item.")
    profile = ClinicFiscalProfile.objects.select_for_update().filter(clinic=invoice.clinic).first()
    validate_fiscal_profile(profile)
    customer_name = invoice.patient.nombre_completo
    if not customer_name:
        raise ValidationError("El cliente debe tener nombre.")
    customer_rtn = clean_rtn(getattr(invoice.patient, "rtn", "") or getattr(invoice.patient, "identidad", ""))
    if profile.require_customer_rtn and len(customer_rtn) != 14:
        raise ValidationError("El RTN del cliente es obligatorio para esta clinica.")
    fiscal_range, fiscal_number = get_next_fiscal_number(invoice.clinic)
    totals = calculate_fiscal_totals(invoice)
    for field, value in totals.items():
        setattr(invoice, field, value)
    invoice.is_fiscal = True
    invoice.fiscal_status = Invoice.FiscalStatus.ISSUED
    invoice.fiscal_number = fiscal_number
    invoice.cai = fiscal_range.cai
    invoice.fiscal_range_start = fiscal_range.full_start_number
    invoice.fiscal_range_end = fiscal_range.full_end_number
    invoice.fiscal_expiration_date = fiscal_range.expiration_date
    invoice.emitter_rtn = clean_rtn(profile.rtn)
    invoice.emitter_legal_name = profile.legal_name
    invoice.emitter_commercial_name = profile.commercial_name
    invoice.emitter_address = profile.address
    invoice.customer_name = customer_name
    invoice.customer_rtn = customer_rtn
    invoice.customer_address = getattr(invoice.patient, "direccion", "") or ""
    invoice.issue_datetime = timezone.now()
    invoice.save()
    return invoice


@transaction.atomic
def cancel_fiscal_invoice(invoice, user, reason):
    invoice = Invoice.objects.select_for_update().get(pk=invoice.pk)
    if invoice.fiscal_status != Invoice.FiscalStatus.ISSUED:
        raise ValidationError("Solo se pueden anular facturas fiscales emitidas.")
    invoice.fiscal_status = Invoice.FiscalStatus.CANCELLED
    invoice.status = Invoice.Status.ANULADA
    invoice.active = False
    invoice.cancelled_by = user
    invoice.cancelled_at = timezone.now()
    invoice.cancellation_reason = reason
    invoice.save(update_fields=["fiscal_status", "status", "active", "cancelled_by", "cancelled_at", "cancellation_reason", "actualizado_en"])
    return invoice
