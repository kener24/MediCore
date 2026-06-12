from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.utils import timezone

from apps.core.models import TimeStampedModel


class InventoryCategory(TimeStampedModel):
    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.CASCADE, null=True, blank=True, related_name="inventory_categories")
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        constraints = [models.UniqueConstraint(fields=["clinic", "name"], name="unique_inventory_category_per_clinic")]

    def __str__(self):
        return self.name


class InventoryItem(TimeStampedModel):
    class Type(models.TextChoices):
        MEDICAMENTO = "medicamento", "Medicamento"
        INSUMO = "insumo", "Insumo"
        EQUIPO = "equipo", "Equipo"
        MATERIAL = "material", "Material"
        LABORATORIO = "laboratorio", "Laboratorio"
        OTRO = "otro", "Otro"

    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.PROTECT, related_name="inventory_items")
    category = models.ForeignKey(InventoryCategory, on_delete=models.PROTECT, related_name="items")
    name = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    sku = models.CharField(max_length=80, blank=True)
    barcode = models.CharField(max_length=80, blank=True)
    item_type = models.CharField(max_length=30, choices=Type.choices, default=Type.OTRO)
    unit = models.CharField(max_length=40, default="unidad")
    presentation = models.CharField(max_length=120, blank=True)
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sale_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    stock_current = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    stock_minimum = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    stock_maximum = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    requires_lot = models.BooleanField(default=False)
    requires_expiration = models.BooleanField(default=False)
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["clinic", "sku"], condition=~models.Q(sku=""), name="unique_inventory_sku_per_clinic"),
            models.UniqueConstraint(fields=["clinic", "barcode"], condition=~models.Q(barcode=""), name="unique_inventory_barcode_per_clinic"),
        ]

    def clean(self):
        if self.category_id and self.category.clinic_id and self.category.clinic_id != self.clinic_id:
            raise ValidationError("La categoria debe ser global o pertenecer a la misma clinica.")
        if self.cost_price < 0 or self.sale_price < 0 or self.stock_minimum < 0 or self.stock_maximum < 0:
            raise ValidationError("Precios y stocks minimos/maximos no pueden ser negativos.")

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    @property
    def low_stock(self):
        return self.stock_current <= self.stock_minimum


class InventoryLot(TimeStampedModel):
    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.PROTECT, related_name="inventory_lots")
    item = models.ForeignKey(InventoryItem, on_delete=models.PROTECT, related_name="lots")
    lot_number = models.CharField(max_length=80)
    expiration_date = models.DateField(null=True, blank=True)
    quantity_current = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    received_date = models.DateField(default=timezone.localdate)
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["expiration_date", "lot_number"]
        constraints = [models.UniqueConstraint(fields=["item", "lot_number"], name="unique_lot_number_per_item")]

    def clean(self):
        if self.item_id:
            if self.clinic_id and self.item.clinic_id != self.clinic_id:
                raise ValidationError("El lote debe pertenecer a la misma clinica del producto.")
            if self.item.requires_expiration and not self.expiration_date:
                raise ValidationError("Este producto requiere fecha de vencimiento.")
        if self.cost_price < 0:
            raise ValidationError("El costo no puede ser negativo.")

    def save(self, *args, **kwargs):
        if self.item_id and not self.clinic_id:
            self.clinic = self.item.clinic
        self.full_clean()
        return super().save(*args, **kwargs)


class InventoryMovement(TimeStampedModel):
    class Type(models.TextChoices):
        ENTRADA = "entrada", "Entrada"
        SALIDA = "salida", "Salida"
        AJUSTE_POSITIVO = "ajuste_positivo", "Ajuste positivo"
        AJUSTE_NEGATIVO = "ajuste_negativo", "Ajuste negativo"
        DEVOLUCION = "devolucion", "Devolucion"
        PERDIDA = "perdida", "Perdida"
        VENCIMIENTO = "vencimiento", "Vencimiento"

    POSITIVE = [Type.ENTRADA, Type.AJUSTE_POSITIVO, Type.DEVOLUCION]

    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.PROTECT, related_name="inventory_movements")
    item = models.ForeignKey(InventoryItem, on_delete=models.PROTECT, related_name="movements")
    lot = models.ForeignKey(InventoryLot, on_delete=models.PROTECT, null=True, blank=True, related_name="movements")
    movement_type = models.CharField(max_length=30, choices=Type.choices)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    reason = models.CharField(max_length=180)
    reference_type = models.CharField(max_length=60, blank=True)
    reference_id = models.CharField(max_length=60, blank=True)
    notes = models.TextField(blank=True)
    performed_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="inventory_movements")
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-creado_en"]

    def clean(self):
        if self.quantity <= 0:
            raise ValidationError("La cantidad debe ser mayor que cero.")
        if self.unit_cost < 0:
            raise ValidationError("El costo no puede ser negativo.")
        if self.item_id and self.clinic_id and self.item.clinic_id != self.clinic_id:
            raise ValidationError("El producto debe pertenecer a la misma clinica.")
        if self.lot_id and (self.lot.item_id != self.item_id or self.lot.clinic_id != self.clinic_id):
            raise ValidationError("El lote debe pertenecer al producto y clinica indicados.")

    def is_positive(self):
        return self.movement_type in self.POSITIVE

    def save(self, *args, **kwargs):
        if self.item_id and not self.clinic_id:
            self.clinic = self.item.clinic
        self.full_clean()
        if self.pk:
            return super().save(*args, **kwargs)
        with transaction.atomic():
            item = InventoryItem.objects.select_for_update().get(pk=self.item_id)
            lot = InventoryLot.objects.select_for_update().get(pk=self.lot_id) if self.lot_id else None
            delta = self.quantity if self.is_positive() else -self.quantity
            if item.stock_current + delta < 0:
                raise ValidationError("No hay stock suficiente.")
            if lot and lot.quantity_current + delta < 0:
                raise ValidationError("Este lote no tiene suficiente existencia.")
            item.stock_current += delta
            item.save(update_fields=["stock_current", "actualizado_en"])
            if lot:
                lot.quantity_current += delta
                lot.save(update_fields=["quantity_current", "actualizado_en"])
            return super().save(*args, **kwargs)
