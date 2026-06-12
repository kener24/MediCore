from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Sum
from django.utils import timezone

from apps.clinic_settings.utils import clinic_prefix, next_sequence_number
from apps.core.models import TimeStampedModel


def money(value):
    return Decimal(value).quantize(Decimal("0.01"))


class BillableService(TimeStampedModel):
    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.PROTECT, related_name="billable_services")
    name = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    code = models.CharField(max_length=40, blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    taxable = models.BooleanField(default=False)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        constraints = [models.UniqueConstraint(fields=["clinic", "code"], condition=~models.Q(code=""), name="unique_service_code_per_clinic")]

    def clean(self):
        if self.price < 0:
            raise ValidationError("El precio no puede ser negativo.")
        if self.tax_rate < 0:
            raise ValidationError("El impuesto no puede ser negativo.")

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)


class Invoice(TimeStampedModel):
    class Status(models.TextChoices):
        BORRADOR = "borrador", "Borrador"
        PENDIENTE = "pendiente", "Pendiente"
        PARCIAL = "parcialmente_pagada", "Parcialmente pagada"
        PAGADA = "pagada", "Pagada"
        ANULADA = "anulada", "Anulada"

    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.PROTECT, related_name="invoices")
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT, related_name="invoices")
    appointment = models.ForeignKey("appointments.Appointment", on_delete=models.SET_NULL, null=True, blank=True, related_name="invoices")
    consultation = models.ForeignKey("medical_records.ClinicalConsultation", on_delete=models.SET_NULL, null=True, blank=True, related_name="invoices")
    invoice_number = models.CharField(max_length=30)
    issue_date = models.DateField(default=timezone.localdate)
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.PENDIENTE)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    balance_due = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="invoices_created")
    cancelled_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="invoices_cancelled")
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancellation_reason = models.TextField(blank=True)
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-issue_date", "-creado_en"]
        constraints = [models.UniqueConstraint(fields=["clinic", "invoice_number"], name="unique_invoice_number_per_clinic")]

    @classmethod
    def next_invoice_number(cls, clinic):
        prefix = clinic_prefix(clinic, "invoice_prefix", "FAC")
        return next_sequence_number(cls, clinic, "invoice_number", prefix)

    def clean(self):
        if self.patient_id and self.clinic_id and self.patient.clinic_id != self.clinic_id:
            raise ValidationError("El paciente debe pertenecer a la misma clinica.")
        if self.appointment_id and self.appointment.clinic_id != self.clinic_id:
            raise ValidationError("La cita debe pertenecer a la misma clinica.")
        if self.consultation_id and self.consultation.clinic_id != self.clinic_id:
            raise ValidationError("La consulta debe pertenecer a la misma clinica.")

    def save(self, *args, **kwargs):
        if self.patient_id and not self.clinic_id:
            self.clinic = self.patient.clinic
        if self.clinic_id and not self.invoice_number:
            self.invoice_number = self.next_invoice_number(self.clinic)
        self.full_clean()
        return super().save(*args, **kwargs)

    def recalculate(self):
        items = self.items.filter(active=True)
        subtotal = sum((item.quantity * item.unit_price for item in items), Decimal("0.00"))
        discount = sum((item.discount_amount for item in items), Decimal("0.00"))
        tax = sum((item.tax_amount for item in items), Decimal("0.00"))
        total = subtotal - discount + tax
        paid = self.payments.filter(active=True, status=Payment.Status.APLICADO).aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
        self.subtotal = money(subtotal)
        self.discount_amount = money(discount)
        self.tax_amount = money(tax)
        self.total_amount = money(max(total, Decimal("0.00")))
        self.paid_amount = money(paid)
        self.balance_due = money(max(self.total_amount - paid, Decimal("0.00")))
        if self.status != self.Status.ANULADA:
            if paid <= 0:
                self.status = self.Status.PENDIENTE
            elif paid < self.total_amount:
                self.status = self.Status.PARCIAL
            else:
                self.status = self.Status.PAGADA
        self.save(update_fields=["subtotal", "discount_amount", "tax_amount", "total_amount", "paid_amount", "balance_due", "status", "actualizado_en"])


class InvoiceItem(TimeStampedModel):
    class Type(models.TextChoices):
        SERVICE = "service", "Servicio"
        INVENTORY_ITEM = "inventory_item", "Producto de inventario"
        MEDICATION = "medication", "Medicamento"
        SUPPLY = "supply", "Insumo"
        PROCEDURE = "procedure", "Procedimiento"
        CONSUMPTION = "consumption", "Consumo clinico"
        MANUAL = "manual", "Manual"

    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="items")
    item_type = models.CharField(max_length=30, choices=Type.choices, default=Type.MANUAL)
    service = models.ForeignKey(BillableService, on_delete=models.SET_NULL, null=True, blank=True, related_name="invoice_items")
    inventory_item = models.ForeignKey("inventory.InventoryItem", on_delete=models.SET_NULL, null=True, blank=True, related_name="invoice_items")
    inventory_lot = models.ForeignKey("inventory.InventoryLot", on_delete=models.SET_NULL, null=True, blank=True, related_name="invoice_items")
    related_consultation = models.ForeignKey("medical_records.ClinicalConsultation", on_delete=models.SET_NULL, null=True, blank=True, related_name="invoice_items")
    related_consumption = models.ForeignKey("medical_records.ClinicalSupplyUsage", on_delete=models.SET_NULL, null=True, blank=True, related_name="invoice_items")
    inventory_movement = models.ForeignKey("inventory.InventoryMovement", on_delete=models.SET_NULL, null=True, blank=True, related_name="invoice_items")
    description = models.CharField(max_length=250)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    line_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    active = models.BooleanField(default=True)

    def clean(self):
        if self.invoice_id and self.invoice.status in [Invoice.Status.PAGADA, Invoice.Status.ANULADA]:
            raise ValidationError("No puedes modificar items de una factura pagada o anulada.")
        if self.item_type == self.Type.SERVICE and not self.service_id:
            raise ValidationError("Los items de servicio requieren un servicio.")
        if self.item_type in [self.Type.INVENTORY_ITEM, self.Type.MEDICATION, self.Type.SUPPLY] and not self.inventory_item_id:
            raise ValidationError("Los items de inventario requieren un producto.")
        if self.item_type == self.Type.CONSUMPTION and not self.related_consumption_id:
            raise ValidationError("Los items de consumo requieren un consumo clinico.")
        if self.service_id and self.invoice_id and self.service.clinic_id != self.invoice.clinic_id:
            raise ValidationError("El servicio debe pertenecer a la misma clinica.")
        if self.inventory_item_id and self.invoice_id and self.inventory_item.clinic_id != self.invoice.clinic_id:
            raise ValidationError("El producto debe pertenecer a la misma clinica.")
        if self.inventory_lot_id and (self.inventory_lot.item_id != self.inventory_item_id or self.inventory_lot.clinic_id != self.invoice.clinic_id):
            raise ValidationError("El lote debe pertenecer al producto y clinica indicados.")
        if self.related_consumption_id and self.invoice_id:
            if self.related_consumption.patient_id != self.invoice.patient_id or self.related_consumption.clinic_id != self.invoice.clinic_id:
                raise ValidationError("El consumo debe pertenecer al mismo paciente y clinica.")
        if self.quantity <= 0:
            raise ValidationError("La cantidad debe ser mayor que cero.")
        if self.unit_price < 0 or self.discount_amount < 0:
            raise ValidationError("Precio y descuento no pueden ser negativos.")
        if self.discount_amount > self.quantity * self.unit_price:
            raise ValidationError("El descuento no puede ser mayor al subtotal de linea.")

    def save(self, *args, **kwargs):
        if self.service_id:
            if self.item_type == self.Type.MANUAL:
                self.item_type = self.Type.SERVICE
            if not self.description:
                self.description = self.service.name
            if not self.unit_price:
                self.unit_price = self.service.price
            if self.service.taxable and not self.tax_rate:
                self.tax_rate = self.service.tax_rate
        if self.related_consumption_id:
            self.item_type = self.Type.CONSUMPTION
            self.inventory_item = self.related_consumption.inventory_item
            self.inventory_lot = self.related_consumption.inventory_lot
            self.related_consultation = self.related_consumption.consultation
            if not self.description:
                self.description = self.related_consumption.description
            self.quantity = self.related_consumption.quantity
            self.unit_price = self.related_consumption.unit_price
        if self.inventory_item_id and not self.related_consumption_id:
            if self.item_type == self.Type.MANUAL:
                self.item_type = self.Type.INVENTORY_ITEM
            if not self.description:
                self.description = self.inventory_item.name
            if not self.unit_price:
                self.unit_price = self.inventory_item.sale_price
        base = self.quantity * self.unit_price
        self.tax_amount = money((base - self.discount_amount) * (self.tax_rate / Decimal("100")))
        self.line_total = money(base - self.discount_amount + self.tax_amount)
        self.full_clean()
        result = super().save(*args, **kwargs)
        self.invoice.recalculate()
        return result


class CashSession(TimeStampedModel):
    class Status(models.TextChoices):
        ABIERTA = "abierta", "Abierta"
        CERRADA = "cerrada", "Cerrada"

    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.PROTECT, related_name="cash_sessions")
    opened_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT, related_name="cash_sessions_opened")
    closed_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="cash_sessions_closed")
    opening_datetime = models.DateTimeField(default=timezone.now)
    closing_datetime = models.DateTimeField(null=True, blank=True)
    opening_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    closing_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    expected_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    difference_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ABIERTA)
    notes = models.TextField(blank=True)
    active = models.BooleanField(default=True)

    def clean(self):
        if self.opening_amount < 0 or (self.closing_amount is not None and self.closing_amount < 0):
            raise ValidationError("Montos de caja no pueden ser negativos.")
        if not self.pk and CashSession.objects.filter(clinic=self.clinic, opened_by=self.opened_by, status=self.Status.ABIERTA).exists():
            raise ValidationError("Ya tienes una caja abierta.")

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def totals(self):
        cash = self.payments.filter(active=True, status=Payment.Status.APLICADO, method=Payment.Method.EFECTIVO).aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
        income = self.movements.filter(active=True, movement_type=CashMovement.Type.INGRESO).aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
        expense = self.movements.filter(active=True, movement_type=CashMovement.Type.EGRESO).aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
        return cash, income, expense

    def close(self, user, closing_amount, notes=""):
        if self.status == self.Status.CERRADA:
            raise ValidationError("La caja ya esta cerrada.")
        cash, income, expense = self.totals()
        self.expected_amount = money(self.opening_amount + cash + income - expense)
        self.closing_amount = closing_amount
        self.difference_amount = money(closing_amount - self.expected_amount)
        self.closed_by = user
        self.closing_datetime = timezone.now()
        self.status = self.Status.CERRADA
        self.notes = notes or self.notes
        self.save()


class Payment(TimeStampedModel):
    class Method(models.TextChoices):
        EFECTIVO = "efectivo", "Efectivo"
        TARJETA = "tarjeta", "Tarjeta"
        TRANSFERENCIA = "transferencia", "Transferencia"
        DEPOSITO = "deposito", "Deposito"
        CHEQUE = "cheque", "Cheque"
        OTRO = "otro", "Otro"

    class Status(models.TextChoices):
        APLICADO = "aplicado", "Aplicado"
        ANULADO = "anulado", "Anulado"

    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.PROTECT, related_name="payments")
    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name="payments")
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT, related_name="payments")
    cash_session = models.ForeignKey(CashSession, on_delete=models.SET_NULL, null=True, blank=True, related_name="payments")
    payment_number = models.CharField(max_length=30)
    payment_date = models.DateField(default=timezone.localdate)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    method = models.CharField(max_length=30, choices=Method.choices, default=Method.EFECTIVO)
    reference = models.CharField(max_length=120, blank=True)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.APLICADO)
    received_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="payments_received")
    cancelled_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="payments_cancelled")
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancellation_reason = models.TextField(blank=True)
    active = models.BooleanField(default=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["clinic", "payment_number"], name="unique_payment_number_per_clinic")]

    @classmethod
    def next_payment_number(cls, clinic):
        last = cls.objects.filter(clinic=clinic, payment_number__startswith="PAY-").order_by("-id").first()
        value = int(last.payment_number.replace("PAY-", "")) + 1 if last and last.payment_number.replace("PAY-", "").isdigit() else 1
        return f"PAY-{value:06d}"

    def clean(self):
        if self.amount <= 0:
            raise ValidationError("El pago debe ser mayor que cero.")
        if self.invoice_id:
            if self.invoice.status == Invoice.Status.ANULADA:
                raise ValidationError("No se puede pagar una factura anulada.")
            balance = self.invoice.balance_due
            if not self.pk and self.amount > balance:
                raise ValidationError("El pago no puede ser mayor al saldo pendiente.")

    def save(self, *args, **kwargs):
        if self.invoice_id:
            self.clinic = self.invoice.clinic
            self.patient = self.invoice.patient
        if self.clinic_id and not self.payment_number:
            self.payment_number = self.next_payment_number(self.clinic)
        self.full_clean()
        result = super().save(*args, **kwargs)
        self.invoice.recalculate()
        return result


class CashMovement(TimeStampedModel):
    class Type(models.TextChoices):
        INGRESO = "ingreso", "Ingreso"
        EGRESO = "egreso", "Egreso"

    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.PROTECT, related_name="cash_movements")
    cash_session = models.ForeignKey(CashSession, on_delete=models.CASCADE, related_name="movements")
    movement_type = models.CharField(max_length=20, choices=Type.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reason = models.CharField(max_length=180)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="cash_movements_created")
    active = models.BooleanField(default=True)

    def clean(self):
        if self.amount <= 0:
            raise ValidationError("El movimiento debe ser mayor que cero.")
        if self.cash_session_id and self.cash_session.status != CashSession.Status.ABIERTA:
            raise ValidationError("No se puede registrar movimiento en caja cerrada.")

    def save(self, *args, **kwargs):
        if self.cash_session_id:
            self.clinic = self.cash_session.clinic
        self.full_clean()
        return super().save(*args, **kwargs)
