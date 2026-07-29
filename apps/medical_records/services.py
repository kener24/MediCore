import uuid
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction

from apps.inventory.models import InventoryItem, InventoryMovement
from apps.inventory.services import allocate_fefo_lots
from apps.medical_records.models import ClinicalSupplyUsage


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
    allocations = allocate_fefo_lots(item, quantity, selected_lot)
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
