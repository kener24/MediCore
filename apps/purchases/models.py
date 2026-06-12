from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.db.models import Sum
from django.utils import timezone

from apps.clinic_settings.utils import clinic_prefix, next_sequence_number
from apps.core.models import TimeStampedModel
from apps.inventory.models import InventoryLot, InventoryMovement


def money(value):
    return Decimal(value or 0).quantize(Decimal("0.01"))


class Supplier(TimeStampedModel):
    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.PROTECT, related_name="suppliers")
    name = models.CharField(max_length=180)
    rtn = models.CharField(max_length=40, blank=True)
    contact_name = models.CharField(max_length=160, blank=True)
    phone = models.CharField(max_length=40, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, default="Honduras", blank=True)
    notes = models.TextField(blank=True)
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["clinic", "rtn"], condition=~models.Q(rtn=""), name="unique_supplier_rtn_per_clinic")
        ]

    def __str__(self):
        return self.name


class PurchaseOrder(TimeStampedModel):
    class Status(models.TextChoices):
        BORRADOR = "borrador", "Borrador"
        PENDIENTE = "pendiente", "Pendiente"
        APROBADA = "aprobada", "Aprobada"
        RECIBIDA_PARCIAL = "recibida_parcial", "Recibida parcial"
        RECIBIDA = "recibida", "Recibida"
        CANCELADA = "cancelada", "Cancelada"

    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.PROTECT, related_name="purchase_orders")
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name="purchase_orders")
    order_number = models.CharField(max_length=30, blank=True)
    order_date = models.DateField(default=timezone.localdate)
    expected_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.PENDIENTE)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="purchase_orders_created")
    approved_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="purchase_orders_approved")
    approved_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="purchase_orders_cancelled")
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancellation_reason = models.TextField(blank=True)
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-order_date", "-creado_en"]
        constraints = [models.UniqueConstraint(fields=["clinic", "order_number"], name="unique_purchase_order_number_per_clinic")]

    @classmethod
    def next_order_number(cls, clinic):
        prefix = clinic_prefix(clinic, "purchase_order_prefix", "PO")
        return next_sequence_number(cls, clinic, "order_number", prefix)

    def clean(self):
        if self.supplier_id and self.clinic_id and self.supplier.clinic_id != self.clinic_id:
            raise ValidationError("El proveedor debe pertenecer a la misma clinica.")
        if self.total_amount < 0:
            raise ValidationError("El total no puede ser negativo.")

    def save(self, *args, **kwargs):
        if self.supplier_id and not self.clinic_id:
            self.clinic = self.supplier.clinic
        if self.clinic_id and not self.order_number:
            self.order_number = self.next_order_number(self.clinic)
        self.full_clean()
        return super().save(*args, **kwargs)

    def recalculate(self):
        items = self.items.filter(active=True)
        subtotal = sum((item.quantity_ordered * item.unit_cost for item in items), Decimal("0.00"))
        discount = sum((item.discount_amount for item in items), Decimal("0.00"))
        tax = sum((item.tax_amount for item in items), Decimal("0.00"))
        self.subtotal = money(subtotal)
        self.discount_amount = money(discount)
        self.tax_amount = money(tax)
        self.total_amount = money(max(subtotal - discount + tax, Decimal("0.00")))
        self.save(update_fields=["subtotal", "discount_amount", "tax_amount", "total_amount", "actualizado_en"])

    def refresh_receipt_status(self):
        items = list(self.items.filter(active=True))
        if not items:
            return
        received_any = any(item.quantity_received > 0 for item in items)
        complete = all(item.quantity_received >= item.quantity_ordered for item in items)
        if complete:
            self.status = self.Status.RECIBIDA
        elif received_any:
            self.status = self.Status.RECIBIDA_PARCIAL
        self.save(update_fields=["status", "actualizado_en"])


class PurchaseOrderItem(TimeStampedModel):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name="items")
    item = models.ForeignKey("inventory.InventoryItem", on_delete=models.PROTECT, related_name="purchase_order_items")
    description = models.CharField(max_length=250, blank=True)
    quantity_ordered = models.DecimalField(max_digits=12, decimal_places=2)
    quantity_received = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    line_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["id"]

    @property
    def pending_quantity(self):
        return max(self.quantity_ordered - self.quantity_received, Decimal("0.00"))

    def clean(self):
        if self.purchase_order_id and self.purchase_order.status in [PurchaseOrder.Status.CANCELADA, PurchaseOrder.Status.RECIBIDA]:
            raise ValidationError("No puedes modificar una orden cancelada o recibida.")
        if self.item_id and self.purchase_order_id and self.item.clinic_id != self.purchase_order.clinic_id:
            raise ValidationError("El producto debe pertenecer a la misma clinica.")
        if self.quantity_ordered <= 0:
            raise ValidationError("La cantidad debe ser mayor que cero.")
        if self.quantity_received < 0 or self.quantity_received > self.quantity_ordered:
            raise ValidationError("La cantidad recibida no es valida.")
        if self.unit_cost < 0 or self.discount_amount < 0 or self.tax_rate < 0:
            raise ValidationError("Costos, descuentos e impuestos no pueden ser negativos.")
        if self.discount_amount > self.quantity_ordered * self.unit_cost:
            raise ValidationError("El descuento no puede ser mayor al subtotal de linea.")

    def save(self, *args, **kwargs):
        if self.item_id and not self.description:
            self.description = self.item.name
        base = self.quantity_ordered * self.unit_cost
        self.tax_amount = money((base - self.discount_amount) * (self.tax_rate / Decimal("100")))
        self.line_total = money(base - self.discount_amount + self.tax_amount)
        self.full_clean()
        result = super().save(*args, **kwargs)
        self.purchase_order.recalculate()
        return result


class PurchaseReceipt(TimeStampedModel):
    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.PROTECT, related_name="purchase_receipts")
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.PROTECT, related_name="receipts")
    receipt_number = models.CharField(max_length=30, blank=True)
    receipt_date = models.DateField(default=timezone.localdate)
    received_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="purchase_receipts_received")
    notes = models.TextField(blank=True)
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-receipt_date", "-creado_en"]
        constraints = [models.UniqueConstraint(fields=["clinic", "receipt_number"], name="unique_purchase_receipt_number_per_clinic")]

    @classmethod
    def next_receipt_number(cls, clinic):
        last = cls.objects.filter(clinic=clinic, receipt_number__startswith="REC-").order_by("-id").first()
        value = int(last.receipt_number.replace("REC-", "")) + 1 if last and last.receipt_number.replace("REC-", "").isdigit() else 1
        return f"REC-{value:06d}"

    def clean(self):
        if self.purchase_order_id:
            if self.purchase_order.status == PurchaseOrder.Status.CANCELADA:
                raise ValidationError("No se puede recibir una orden cancelada.")
            if self.clinic_id and self.purchase_order.clinic_id != self.clinic_id:
                raise ValidationError("La recepcion debe pertenecer a la misma clinica.")

    def save(self, *args, **kwargs):
        if self.purchase_order_id and not self.clinic_id:
            self.clinic = self.purchase_order.clinic
        if self.clinic_id and not self.receipt_number:
            self.receipt_number = self.next_receipt_number(self.clinic)
        self.full_clean()
        return super().save(*args, **kwargs)


class PurchaseReceiptItem(TimeStampedModel):
    receipt = models.ForeignKey(PurchaseReceipt, on_delete=models.CASCADE, related_name="items")
    purchase_order_item = models.ForeignKey(PurchaseOrderItem, on_delete=models.PROTECT, related_name="receipt_items")
    item = models.ForeignKey("inventory.InventoryItem", on_delete=models.PROTECT, related_name="purchase_receipt_items")
    lot = models.ForeignKey(InventoryLot, on_delete=models.PROTECT, null=True, blank=True, related_name="purchase_receipt_items")
    quantity_received = models.DecimalField(max_digits=12, decimal_places=2)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    lot_number = models.CharField(max_length=80, blank=True)
    expiration_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    inventory_movement = models.ForeignKey(InventoryMovement, on_delete=models.SET_NULL, null=True, blank=True, related_name="purchase_receipt_items")
    active = models.BooleanField(default=True)

    def clean(self):
        if self.quantity_received <= 0:
            raise ValidationError("La cantidad recibida debe ser mayor que cero.")
        if self.unit_cost < 0:
            raise ValidationError("El costo no puede ser negativo.")
        if self.purchase_order_item_id:
            if self.item_id and self.item_id != self.purchase_order_item.item_id:
                raise ValidationError("El producto no coincide con el item de la orden.")
            if self.receipt_id and self.purchase_order_item.purchase_order_id != self.receipt.purchase_order_id:
                raise ValidationError("El item no pertenece a la orden recibida.")
            if self.quantity_received > self.purchase_order_item.pending_quantity:
                raise ValidationError("No puedes recibir mas de lo pendiente.")
        if self.item_id:
            if self.item.requires_lot and not self.lot_number and not self.lot_id:
                raise ValidationError("Este producto requiere lote.")
            if self.item.requires_expiration and not self.expiration_date:
                raise ValidationError("Este producto requiere fecha de vencimiento.")

    def save(self, *args, **kwargs):
        if self.purchase_order_item_id and not self.item_id:
            self.item = self.purchase_order_item.item
        self.full_clean()
        if self.pk:
            return super().save(*args, **kwargs)
        with transaction.atomic():
            poi = PurchaseOrderItem.objects.select_for_update().select_related("purchase_order", "item").get(pk=self.purchase_order_item_id)
            if self.quantity_received > poi.pending_quantity:
                raise ValidationError("No puedes recibir mas de lo pendiente.")
            lot = self.lot
            if self.lot_number:
                lot, _ = InventoryLot.objects.get_or_create(
                    item=self.item,
                    lot_number=self.lot_number,
                    defaults={
                        "clinic": self.receipt.clinic,
                        "expiration_date": self.expiration_date,
                        "cost_price": self.unit_cost,
                        "received_date": self.receipt.receipt_date,
                    },
                )
                self.lot = lot
            movement = InventoryMovement.objects.create(
                clinic=self.receipt.clinic,
                item=self.item,
                lot=lot,
                movement_type=InventoryMovement.Type.ENTRADA,
                quantity=self.quantity_received,
                unit_cost=self.unit_cost,
                reason="Recepcion de compra",
                reference_type="purchase_receipt",
                reference_id=str(self.receipt_id),
                notes=self.notes,
                performed_by=self.receipt.received_by,
            )
            self.inventory_movement = movement
            result = super().save(*args, **kwargs)
            poi.quantity_received += self.quantity_received
            poi.save(update_fields=["quantity_received", "actualizado_en"])
            poi.purchase_order.refresh_receipt_status()
            return result
