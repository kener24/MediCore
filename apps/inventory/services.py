from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Case, IntegerField, Q, When
from django.utils import timezone

from apps.inventory.models import InventoryItem, InventoryLot, InventoryMovement


def request_idempotency_key(request):
    value = request.headers.get("Idempotency-Key") or request.data.get("idempotency_key")
    return str(value or "").strip()[:100]


def locked_fefo_lots(item):
    return list(
        InventoryLot.objects.select_for_update()
        .filter(clinic=item.clinic, item=item, active=True, quantity_current__gt=0)
        .filter(Q(expiration_date__isnull=True) | Q(expiration_date__gte=timezone.localdate()))
        .annotate(no_expiration=Case(When(expiration_date__isnull=True, then=1), default=0, output_field=IntegerField()))
        .order_by("no_expiration", "expiration_date", "received_date", "id")
    )


def allocate_fefo_lots(item, quantity, selected_lot=None):
    quantity = Decimal(quantity)
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
            raise ValidationError("El lote seleccionado esta vencido y no puede utilizarse.")
        if lot.quantity_current < quantity:
            raise ValidationError("No hay existencia suficiente en el lote seleccionado.")
        return [(lot, quantity)]

    lots = locked_fefo_lots(item)
    if item.requires_lot and not lots:
        raise ValidationError("No hay lotes vigentes con existencia.")
    if not lots:
        return [(None, quantity)]

    remaining = quantity
    allocations = []
    for lot in lots:
        amount = min(remaining, lot.quantity_current)
        if amount > 0:
            allocations.append((lot, amount))
            remaining -= amount
        if remaining <= 0:
            break
    if remaining > 0:
        raise ValidationError("No hay existencia suficiente en los lotes vigentes.")
    return allocations


@transaction.atomic
def register_manual_movement(*, item, user, payload, movement_type):
    item = InventoryItem.objects.select_for_update().get(pk=item.pk)
    quantity = Decimal(payload["quantity"])
    operation_key = str(payload.get("idempotency_key") or "").strip()[:100]
    if operation_key:
        existing = list(
            InventoryMovement.objects.filter(
                clinic=item.clinic,
                item=item,
                performed_by=user,
                movement_type=movement_type,
                reference_type="manual_operation",
                reference_id=operation_key,
            ).order_by("id")
        )
        if existing:
            existing[0]._idempotent_replay = True
            return existing

    lot = None
    if payload.get("lot"):
        lot = InventoryLot.objects.filter(pk=payload["lot"], item=item, clinic=item.clinic, active=True).first()
        if not lot:
            raise ValidationError("El lote no corresponde al producto o a la clinica.")

    if movement_type in InventoryMovement.POSITIVE:
        lot_number = str(payload.get("lot_number") or "").strip()
        expiration_date = payload.get("expiration_date")
        if item.requires_lot and not lot and not lot_number:
            raise ValidationError("Este producto requiere numero de lote.")
        if item.requires_expiration and not expiration_date and not lot:
            raise ValidationError("Este producto requiere fecha de vencimiento.")
        if expiration_date and expiration_date < timezone.localdate():
            raise ValidationError("No se puede ingresar existencia con una fecha de vencimiento pasada.")
        if lot_number:
            lot = InventoryLot.objects.select_for_update().filter(item=item, lot_number=lot_number).first()
            if lot:
                if expiration_date and lot.expiration_date and lot.expiration_date != expiration_date:
                    raise ValidationError("El lote ya existe con una fecha de vencimiento diferente.")
                if lot.expiration_date and lot.expiration_date < timezone.localdate():
                    raise ValidationError("El lote seleccionado esta vencido.")
            else:
                lot = InventoryLot.objects.create(
                    clinic=item.clinic,
                    item=item,
                    lot_number=lot_number,
                    expiration_date=expiration_date,
                    cost_price=payload.get("unit_cost", 0),
                )
        allocations = [(lot, quantity)]
    else:
        if item.stock_current < quantity:
            raise ValidationError("No hay existencia suficiente para completar la operacion.")
        allocations = allocate_fefo_lots(item, quantity, lot)

    movements = []
    for selected, amount in allocations:
        movements.append(
            InventoryMovement.objects.create(
                clinic=item.clinic,
                item=item,
                lot=selected,
                movement_type=movement_type,
                quantity=amount,
                unit_cost=payload.get("unit_cost", selected.cost_price if selected else item.cost_price),
                reason=payload["reason"],
                reference_type="manual_operation",
                reference_id=operation_key,
                notes=payload.get("notes", ""),
                performed_by=user,
            )
        )
    movements[0]._idempotent_replay = False
    return movements
