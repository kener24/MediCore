import json
from collections import defaultdict
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db.models import Count, F, Sum
from django.utils import timezone

from apps.inventory.models import InventoryItem, InventoryLot, InventoryMovement
from apps.medical_records.models import ClinicalSupplyUsage
from apps.purchases.models import PurchaseReceiptItem


class Command(BaseCommand):
    help = "Diagnostica inconsistencias de inventario sin modificar datos."

    def add_arguments(self, parser):
        parser.add_argument("--clinic", type=int, help="Limita el diagnostico a una clinica.")
        parser.add_argument("--json", action="store_true", dest="as_json", help="Devuelve el resultado como JSON.")
        parser.add_argument("--fail-on-errors", action="store_true", help="Termina con error si encuentra inconsistencias criticas.")

    def handle(self, *args, **options):
        clinic_id = options.get("clinic")
        items = InventoryItem.objects.all()
        lots = InventoryLot.objects.select_related("item")
        movements = InventoryMovement.objects.all()
        receipt_items = PurchaseReceiptItem.objects.all()
        consumptions = ClinicalSupplyUsage.objects.all()
        if clinic_id:
            items = items.filter(clinic_id=clinic_id)
            lots = lots.filter(clinic_id=clinic_id)
            movements = movements.filter(clinic_id=clinic_id)
            receipt_items = receipt_items.filter(receipt__clinic_id=clinic_id)
            consumptions = consumptions.filter(clinic_id=clinic_id)

        errors = []
        warnings = []
        lot_totals = defaultdict(lambda: Decimal("0.00"))
        for row in lots.filter(active=True).values("item_id").annotate(total=Sum("quantity_current")):
            lot_totals[row["item_id"]] = row["total"] or Decimal("0.00")
        for item in items.filter(requires_lot=True):
            lot_total = lot_totals[item.id]
            if item.stock_current != lot_total:
                errors.append({"code": "stock_lot_mismatch", "item": item.id, "clinic": item.clinic_id, "stock": str(item.stock_current), "lot_stock": str(lot_total)})

        for lot in lots.filter(quantity_current__lt=0):
            errors.append({"code": "negative_lot", "lot": lot.id, "item": lot.item_id, "clinic": lot.clinic_id, "quantity": str(lot.quantity_current)})
        for lot in lots.filter(active=False, quantity_current__gt=0):
            errors.append({"code": "inactive_lot_with_stock", "lot": lot.id, "item": lot.item_id, "clinic": lot.clinic_id, "quantity": str(lot.quantity_current)})
        for lot in lots.filter(expiration_date__lt=timezone.localdate(), quantity_current__gt=0):
            warnings.append({"code": "expired_lot_with_stock", "lot": lot.id, "item": lot.item_id, "clinic": lot.clinic_id, "quantity": str(lot.quantity_current)})
        for item in items.filter(unit=""):
            errors.append({"code": "item_without_unit", "item": item.id, "clinic": item.clinic_id})

        for movement in movements.exclude(clinic_id=F("item__clinic_id")):
            errors.append({"code": "movement_clinic_mismatch", "movement": movement.id, "item": movement.item_id, "clinic": movement.clinic_id})
        for movement in movements.filter(lot__isnull=False).exclude(lot__item_id=F("item_id")):
            errors.append({"code": "movement_lot_item_mismatch", "movement": movement.id, "item": movement.item_id, "lot": movement.lot_id})
        for movement in movements.filter(lot__isnull=False).exclude(lot__clinic_id=F("clinic_id")):
            errors.append({"code": "movement_lot_clinic_mismatch", "movement": movement.id, "clinic": movement.clinic_id, "lot": movement.lot_id})

        for receipt_item in receipt_items.filter(active=True, inventory_movement__isnull=True):
            errors.append({"code": "receipt_without_movement", "receipt_item": receipt_item.id, "clinic": receipt_item.receipt.clinic_id})
        for usage in consumptions.filter(active=True, inventory_movement__isnull=True):
            errors.append({"code": "consumption_without_movement", "consumption": usage.id, "clinic": usage.clinic_id})

        duplicates = (
            movements.exclude(reference_type="").exclude(reference_id="")
            .values("clinic_id", "item_id", "lot_id", "reference_type", "reference_id", "movement_type")
            .annotate(total=Count("id"))
            .filter(total__gt=1)
        )
        for duplicate in duplicates:
            errors.append({"code": "duplicate_movement_reference", **duplicate})

        result = {
            "clinic": clinic_id,
            "checked": {
                "items": items.count(),
                "lots": lots.count(),
                "movements": movements.count(),
                "receipt_items": receipt_items.count(),
                "consumptions": consumptions.count(),
            },
            "errors": errors,
            "warnings": warnings,
            "consistent": not errors,
        }
        if options["as_json"]:
            self.stdout.write(json.dumps(result, ensure_ascii=False, indent=2, default=str))
        else:
            self.stdout.write(f"Inventario revisado: {result['checked']}")
            self.stdout.write(f"Errores: {len(errors)} | Advertencias: {len(warnings)}")
            for issue in errors:
                self.stdout.write(self.style.ERROR(json.dumps(issue, ensure_ascii=False, default=str)))
            for issue in warnings:
                self.stdout.write(self.style.WARNING(json.dumps(issue, ensure_ascii=False, default=str)))
            if not errors:
                self.stdout.write(self.style.SUCCESS("No se encontraron inconsistencias criticas."))
        if errors and options["fail_on_errors"]:
            raise CommandError(f"Se encontraron {len(errors)} inconsistencias criticas.")
