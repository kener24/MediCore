from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.models import User
from apps.clinics.models import Clinic
from apps.inventory.models import InventoryCategory, InventoryItem, InventoryMovement


class Command(BaseCommand):
    help = "Crea categorias, productos, lotes y movimientos iniciales de inventario."

    def handle(self, *args, **options):
        clinic = Clinic.objects.filter(correo="demo@medicore.com").first() or Clinic.objects.first()
        user = User.objects.filter(email="clinicadmin@medicore.com").first() or User.objects.filter(clinica=clinic).first()
        if not clinic or not user:
            self.stderr.write("Falta clinica o usuario demo.")
            return
        categories = {}
        for name in ["Medicamento", "Insumo medico", "Equipo", "Material descartable", "Laboratorio", "Otro"]:
            categories[name], _ = InventoryCategory.objects.get_or_create(clinic=clinic, name=name, defaults={"description": f"Categoria {name}"})
        products = [
            ("MED-ACET-500", "Acetaminofen 500mg tabletas", "medicamento", "tableta", "Medicamento", 2, 5, True, True),
            ("MED-IBU-400", "Ibuprofeno 400mg tabletas", "medicamento", "tableta", "Medicamento", 3, 7, True, True),
            ("MED-AMOX-500", "Amoxicilina 500mg capsulas", "medicamento", "capsula", "Medicamento", 8, 15, True, True),
            ("INS-GUAN-M", "Guantes de examen talla M", "insumo", "caja", "Insumo medico", 80, 120, False, False),
            ("INS-JER-5", "Jeringas 5ml", "insumo", "unidad", "Material descartable", 1, 3, False, False),
            ("EQ-TERM-DIG", "Termometro digital", "equipo", "unidad", "Equipo", 120, 180, False, False),
        ]
        for sku, name, item_type, unit, category, cost, sale, requires_lot, requires_expiration in products:
            item, _ = InventoryItem.objects.get_or_create(
                clinic=clinic,
                sku=sku,
                defaults={
                    "category": categories[category],
                    "name": name,
                    "item_type": item_type,
                    "unit": unit,
                    "cost_price": Decimal(str(cost)),
                    "sale_price": Decimal(str(sale)),
                    "stock_minimum": 10,
                    "requires_lot": requires_lot,
                    "requires_expiration": requires_expiration,
                },
            )
            if item.stock_current <= 0:
                lot_number = f"LOT-{sku}"
                InventoryMovement.objects.create(
                    item=item,
                    movement_type=InventoryMovement.Type.ENTRADA,
                    quantity=50,
                    unit_cost=item.cost_price,
                    reason="Entrada inicial demo",
                    reference_type="ajuste_manual",
                    notes="Seed de inventario",
                    performed_by=user,
                    lot=None if not item.requires_lot else item.lots.create(lot_number=lot_number, expiration_date=timezone.localdate() + timezone.timedelta(days=180), cost_price=item.cost_price),
                )
        self.stdout.write(self.style.SUCCESS("Inventario demo creado o actualizado."))
