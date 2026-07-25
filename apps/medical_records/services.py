import uuid
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Case, IntegerField, Q, When
from django.utils import timezone

from apps.inventory.models import InventoryItem, InventoryLot, InventoryMovement
from apps.medical_records.models import ClinicalSupplyUsage


def _locked_fefo_lots(item):
    return list(
        InventoryLot.objects.select_for_update()
        .filter(clinic=item.clinic, item=item, active=True, quantity_current__gt=0)
        .filter(Q(expiration_date__isnull=True) | Q(expiration_date__gte=timezone.localdate()))
        .annotate(no_expiration=Case(When(expiration_date__isnull=True, then=1), default=0, output_field=IntegerField()))
        .order_by("no_expiration", "expiration_date", "received_date", "id")
    )
def _allocations(item, quantity, selected_lot=None):
    if selected_lot:
        lot = InventoryLot.objects.select_for_update().filter(
            pk=selected_lot.pk,
            clinic=item.clinic,
            item=item,
            active=True,
        ).first()
        if not lot:
            raise ValidationError("El lote no corresponde al producto o a la clinica.")
        if lot.expiration_date and lot.expiration_date < timezone.localdate():
            raise ValidationError("El lote seleccionado esta vencido.")
        if lot.quantity_current < quantity:
            raise ValidationError("No hay existencia suficiente en el lote seleccionado.")
        return [(lot, quantity)]

    lots = _locked_fefo_lots(item)
    if item.requires_lot and not lots:
        raise ValidationError("No hay lotes vigentes con existencia.")
    if not lots:
        return [(None, quantity)]

    remaining = quantity
    result = []
    for lot in lots:
        amount = min(remaining, lot.quantity_current)
        if amount > 0:
            result.append((lot, amount))
            remaining -= amount
        if remaining <= 0:
            break
    if remaining > 0:
        raise ValidationError("No hay existencia suficiente en los lotes vigentes.")
    return result


@transaction.atomic
def consume_inventory_item(validated_data):
    requested_item = validated_data["inventory_item"]
    item = InventoryItem.objects.select_for_update().get(pk=requested_item.pk)
    clinic = validated_data["clinic"]
    quantity = Decimal(validated_data["quantity"])
    idempotency_key = (validated_data.pop("idempotency_key", "") or "").strip()[:100]

    if item.clinic_id != clinic.id:
        raise ValidationError("El producto no pertenece a la clinica de la consulta.")
    if not item.active:
        raise ValidationError("El producto esta inactivo.")
    if quantity <= 0:
        raise ValidationError("La cantidad debe ser mayor que cero.")

    if idempotency_key:
        existing = ClinicalSupplyUsage.objects.select_for_update().filter(clinic=clinic, idempotency_key=idempotency_key).first()
        if existing:
            existing._idempotent_replay = True
            return existing

    if item.stock_current < quantity:
        raise ValidationError("No hay existencia suficiente para completar el consumo.")

    selected_lot = validated_data.pop("inventory_lot", None)
    allocations = _allocations(item, quantity, selected_lot)
    group = str(uuid.uuid4())
    created = []
    for index, (lot, amount) in enumerate(allocations):
        usage_data = dict(validated_data)
        usage_data.update(
            inventory_item=item,
            inventory_lot=lot,
            quantity=amount,
            idempotency_key=idempotency_key if index == 0 else None,
            consumption_group=group,
        )
        usage = ClinicalSupplyUsage(**usage_data)
        usage.unit_cost = lot.cost_price if lot else item.cost_price
        usage.unit_price = usage.unit_price or item.sale_price
        usage.save()
        movement = InventoryMovement.objects.create(
            clinic=clinic,
            item=item,
            lot=lot,
            movement_type=InventoryMovement.Type.SALIDA,
            quantity=amount,
            unit_cost=usage.unit_cost,
            reason="clinical_consumption",
            reference_type="clinical_consumption",
            reference_id=str(usage.id),
            notes=usage.notes,
            performed_by=usage.applied_by,
        )
        usage.inventory_movement = movement
        usage.save(update_fields=["inventory_movement", "actualizado_en"])
        created.append(usage)

    primary = created[0]
    primary._group_usages = created
    primary._idempotent_replay = False
    return primary
