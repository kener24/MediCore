from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.models import User
from apps.clinics.models import Clinic
from apps.inventory.models import InventoryItem
from apps.purchases.models import PurchaseOrder, PurchaseOrderItem, PurchaseReceiptItem, Supplier


class Command(BaseCommand):
    help = "Crea proveedores, ordenes y recepciones demo para compras."

    def handle(self, *args, **options):
        clinic = Clinic.objects.filter(correo="demo@medicore.com").first() or Clinic.objects.first()
        user = User.objects.filter(email="clinicadmin@medicore.com").first() or User.objects.filter(clinica=clinic).first()
        if not clinic or not user:
            self.stderr.write("Falta clinica o usuario demo.")
            return

        suppliers = {}
        for index, name in enumerate(["Drogueria Central", "FarmaSalud Honduras", "Distribuidora Medica del Norte", "Insumos Clinicos HN", "Laboratorios Medicos ProSalud"], start=1):
            suppliers[name], _ = Supplier.objects.get_or_create(
                clinic=clinic,
                name=name,
                defaults={
                    "rtn": f"08011990000{index:02d}",
                    "contact_name": "Ejecutivo comercial",
                    "phone": f"+504 2200-00{index:02d}",
                    "email": f"proveedor{index}@demo.test",
                    "city": "Tegucigalpa",
                    "country": "Honduras",
                    "notes": "Proveedor demo de MediCore",
                },
            )

        items = list(InventoryItem.objects.filter(clinic=clinic, active=True)[:4])
        if not items:
            self.stderr.write("No hay productos de inventario. Ejecuta seed_inventory primero.")
            return

        order, created = PurchaseOrder.objects.get_or_create(
            clinic=clinic,
            supplier=suppliers["Drogueria Central"],
            order_number="PO-000100",
            defaults={
                "order_date": timezone.localdate(),
                "expected_date": timezone.localdate() + timezone.timedelta(days=5),
                "status": PurchaseOrder.Status.APROBADA,
                "notes": "Orden demo para reposicion de inventario",
                "created_by": user,
                "approved_by": user,
                "approved_at": timezone.now(),
            },
        )
        if created:
            for item in items[:3]:
                PurchaseOrderItem.objects.create(
                    purchase_order=order,
                    item=item,
                    description=item.name,
                    quantity_ordered=Decimal("12.00"),
                    unit_cost=item.cost_price or Decimal("1.00"),
                    discount_amount=Decimal("0.00"),
                    tax_rate=Decimal("0.00"),
                )
            order.recalculate()

        if not order.receipts.exists() and order.items.exists():
            receipt = order.receipts.create(clinic=clinic, receipt_date=timezone.localdate(), received_by=user, notes="Recepcion parcial demo")
            first = order.items.select_related("item").first()
            PurchaseReceiptItem.objects.create(
                receipt=receipt,
                purchase_order_item=first,
                item=first.item,
                quantity_received=Decimal("5.00"),
                unit_cost=first.unit_cost,
                lot_number=f"COMP-{first.item.sku or first.item_id}",
                expiration_date=timezone.localdate() + timezone.timedelta(days=365) if first.item.requires_expiration else None,
                notes="Recepcion inicial de prueba",
            )

        self.stdout.write(self.style.SUCCESS("Compras demo creadas o actualizadas."))
