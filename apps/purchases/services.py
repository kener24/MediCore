from collections import defaultdict
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.inventory.models import InventoryItem, InventoryLot, InventoryMovement
from apps.purchases.models import (
    PurchaseOrder,
    PurchaseOrderItem,
    PurchaseReceipt,
    PurchaseReceiptItem,
    PurchaseReturn,
    PurchaseReturnItem,
)


def normalize_idempotency_key(value):
    return str(value or "").strip()[:100] or None


@transaction.atomic
def receive_purchase_order(*, order, user, data, idempotency_key=None):
    order = PurchaseOrder.objects.select_for_update().get(pk=order.pk)
    type(order.clinic).objects.select_for_update().get(pk=order.clinic_id)
    if order.status not in [PurchaseOrder.Status.APROBADA, PurchaseOrder.Status.RECIBIDA_PARCIAL]:
        raise ValidationError("La orden debe estar aprobada y tener cantidades pendientes para poder recibirla.")

    key = normalize_idempotency_key(idempotency_key)
    if key:
        existing = PurchaseReceipt.objects.filter(
            clinic=order.clinic,
            purchase_order=order,
            received_by=user,
            idempotency_key=key,
        ).first()
        if existing:
            existing._idempotent_replay = True
            return existing

    entries = data.get("items") or []
    if not entries:
        raise ValidationError("Debes enviar al menos un producto recibido.")
    order_item_ids = {entry["purchase_order_item"] for entry in entries}
    locked_items = {
        item.id: item
        for item in PurchaseOrderItem.objects.select_for_update()
        .select_related("item", "purchase_order")
        .filter(purchase_order=order, active=True, id__in=order_item_ids)
    }
    if len(locked_items) != len(order_item_ids):
        raise ValidationError("Uno o mas productos no pertenecen a la orden.")

    totals = defaultdict(lambda: Decimal("0.00"))
    seen_lots = set()
    receipt_date = data.get("receipt_date") or timezone.localdate()
    for entry in entries:
        order_item = locked_items[entry["purchase_order_item"]]
        quantity = Decimal(entry["quantity_received"])
        totals[order_item.id] += quantity
        lot_number = str(entry.get("lot_number") or "").strip()
        lot_key = (order_item.id, lot_number.lower())
        if lot_key in seen_lots:
            raise ValidationError("Un mismo producto y lote no puede repetirse en una recepcion.")
        seen_lots.add(lot_key)
        if order_item.item.requires_lot and not lot_number:
            raise ValidationError(f"{order_item.item.name} requiere numero de lote.")
        expiration = entry.get("expiration_date")
        if order_item.item.requires_expiration and not expiration:
            raise ValidationError(f"{order_item.item.name} requiere fecha de vencimiento.")
        if expiration and expiration < receipt_date:
            raise ValidationError("No se puede recibir un lote vencido.")
    for order_item_id, total in totals.items():
        if total > locked_items[order_item_id].pending_quantity:
            raise ValidationError("La cantidad recibida supera la cantidad pendiente.")

    receipt = PurchaseReceipt.objects.create(
        purchase_order=order,
        clinic=order.clinic,
        receipt_date=receipt_date,
        notes=data.get("notes", ""),
        received_by=user,
        idempotency_key=key,
    )
    for entry in entries:
        order_item = locked_items[entry["purchase_order_item"]]
        PurchaseReceiptItem.objects.create(
            receipt=receipt,
            purchase_order_item=order_item,
            item=order_item.item,
            quantity_received=entry["quantity_received"],
            unit_cost=entry.get("unit_cost") if entry.get("unit_cost") is not None else order_item.unit_cost,
            lot_number=str(entry.get("lot_number") or "").strip(),
            expiration_date=entry.get("expiration_date"),
            notes=entry.get("notes", ""),
        )
    receipt._idempotent_replay = False
    return receipt


@transaction.atomic
def reverse_purchase_receipt(*, receipt, user, reason):
    reason = str(reason or "").strip()
    if not reason:
        raise ValidationError("El motivo de reversion es obligatorio.")
    receipt = PurchaseReceipt.objects.select_for_update().select_related("purchase_order").get(pk=receipt.pk)
    if not receipt.active or receipt.reversed_at:
        raise ValidationError("La recepcion ya fue revertida.")
    receipt_items = list(
        PurchaseReceiptItem.objects.select_for_update()
        .select_related("item", "lot", "purchase_order_item", "inventory_movement")
        .filter(receipt=receipt, active=True)
    )
    if any(item.quantity_returned > 0 for item in receipt_items):
        raise ValidationError("La recepcion tiene devoluciones y no puede revertirse completamente.")

    for receipt_item in receipt_items:
        locked_item = InventoryItem.objects.select_for_update().get(pk=receipt_item.item_id)
        locked_lot = InventoryLot.objects.select_for_update().get(pk=receipt_item.lot_id) if receipt_item.lot_id else None
        if locked_item.stock_current < receipt_item.quantity_received or (locked_lot and locked_lot.quantity_current < receipt_item.quantity_received):
            raise ValidationError("Parte de la mercancia ya fue consumida y la recepcion no puede revertirse.")
        InventoryMovement.objects.create(
            clinic=receipt.clinic,
            item=locked_item,
            lot=locked_lot,
            movement_type=InventoryMovement.Type.REVERSION,
            quantity=receipt_item.quantity_received,
            unit_cost=receipt_item.unit_cost,
            reason=reason,
            reference_type="purchase_receipt_reversal",
            reference_id=str(receipt.id),
            notes=receipt_item.notes,
            performed_by=user,
            reversed_movement=receipt_item.inventory_movement,
        )
        order_item = PurchaseOrderItem.objects.select_for_update().get(pk=receipt_item.purchase_order_item_id)
        order_item.quantity_received -= receipt_item.quantity_received
        order_item.save(update_fields=["quantity_received", "actualizado_en"])

    receipt.active = False
    receipt.reversed_at = timezone.now()
    receipt.reversed_by = user
    receipt.reversal_reason = reason
    receipt.save(update_fields=["active", "reversed_at", "reversed_by", "reversal_reason", "actualizado_en"])
    receipt.purchase_order.refresh_receipt_status()
    return receipt


@transaction.atomic
def return_purchase_items(*, receipt, user, reason, entries, idempotency_key=None):
    reason = str(reason or "").strip()
    if not reason:
        raise ValidationError("El motivo de devolucion es obligatorio.")
    receipt = PurchaseReceipt.objects.select_for_update().select_related("purchase_order").get(pk=receipt.pk)
    type(receipt.clinic).objects.select_for_update().get(pk=receipt.clinic_id)
    if not receipt.active or receipt.reversed_at:
        raise ValidationError("No se puede devolver mercancia de una recepcion revertida.")
    key = normalize_idempotency_key(idempotency_key)
    if key:
        existing = PurchaseReturn.objects.filter(clinic=receipt.clinic, receipt=receipt, created_by=user, idempotency_key=key).first()
        if existing:
            existing._idempotent_replay = True
            return existing
    if not entries:
        raise ValidationError("Debes indicar al menos un producto a devolver.")

    quantities = defaultdict(lambda: Decimal("0.00"))
    for entry in entries:
        quantities[int(entry["receipt_item"])] += Decimal(entry["quantity"])
    receipt_items = {
        item.id: item
        for item in PurchaseReceiptItem.objects.select_for_update()
        .select_related("item", "lot", "purchase_order_item")
        .filter(receipt=receipt, active=True, id__in=quantities.keys())
    }
    if len(receipt_items) != len(quantities):
        raise ValidationError("Uno o mas productos no pertenecen a la recepcion.")
    for item_id, quantity in quantities.items():
        if quantity <= 0 or quantity > receipt_items[item_id].returnable_quantity:
            raise ValidationError("La cantidad devuelta supera la cantidad disponible de la recepcion.")

    purchase_return = PurchaseReturn.objects.create(
        clinic=receipt.clinic,
        receipt=receipt,
        reason=reason,
        created_by=user,
        idempotency_key=key,
    )
    for item_id, quantity in quantities.items():
        receipt_item = receipt_items[item_id]
        locked_item = InventoryItem.objects.select_for_update().get(pk=receipt_item.item_id)
        locked_lot = InventoryLot.objects.select_for_update().get(pk=receipt_item.lot_id) if receipt_item.lot_id else None
        if locked_item.stock_current < quantity or (locked_lot and locked_lot.quantity_current < quantity):
            raise ValidationError("No hay existencia suficiente para devolver al proveedor.")
        movement = InventoryMovement.objects.create(
            clinic=receipt.clinic,
            item=locked_item,
            lot=locked_lot,
            movement_type=InventoryMovement.Type.DEVOLUCION_PROVEEDOR,
            quantity=quantity,
            unit_cost=receipt_item.unit_cost,
            reason=reason,
            reference_type="purchase_return",
            reference_id=str(purchase_return.id),
            performed_by=user,
        )
        PurchaseReturnItem.objects.create(
            purchase_return=purchase_return,
            receipt_item=receipt_item,
            item=locked_item,
            lot=locked_lot,
            quantity_returned=quantity,
            unit_cost=receipt_item.unit_cost,
            inventory_movement=movement,
        )
        receipt_item.quantity_returned += quantity
        receipt_item.save(update_fields=["quantity_returned", "actualizado_en"])
        order_item = PurchaseOrderItem.objects.select_for_update().get(pk=receipt_item.purchase_order_item_id)
        order_item.quantity_received -= quantity
        order_item.save(update_fields=["quantity_received", "actualizado_en"])

    receipt.purchase_order.refresh_receipt_status()
    purchase_return._idempotent_replay = False
    return purchase_return
