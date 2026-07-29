from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal
from threading import Barrier
from unittest import skipUnless

from django.core.exceptions import ValidationError
from django.db import close_old_connections, connection
from django.test import TransactionTestCase

from apps.accounts.models import Role, User
from apps.clinics.models import Clinic
from apps.inventory.models import InventoryCategory, InventoryItem, InventoryMovement
from apps.inventory.services import register_manual_movement
from apps.purchases.models import PurchaseOrder, PurchaseOrderItem, Supplier
from apps.purchases.services import receive_purchase_order


@skipUnless(connection.vendor == "mysql", "La concurrencia con select_for_update se certifica sobre MySQL.")
class InventoryPurchaseMySQLConcurrencyTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        role = Role.objects.create(nombre="admin")
        self.clinic = Clinic.objects.create(nombre="Clinica concurrencia")
        self.user = User.objects.create_user(email="concurrency@test.com", password="Test12345*", role=role, clinica=self.clinic)
        category = InventoryCategory.objects.create(clinic=self.clinic, name="Concurrencia")
        self.item = InventoryItem.objects.create(clinic=self.clinic, category=category, name="Producto concurrente", stock_current=Decimal("10.00"))
        self.supplier = Supplier.objects.create(clinic=self.clinic, name="Proveedor concurrente")

    @staticmethod
    def run_parallel(operation):
        barrier = Barrier(2)

        def runner():
            close_old_connections()
            barrier.wait()
            try:
                operation()
                return "ok"
            except ValidationError:
                return "blocked"
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as executor:
            return list(executor.map(lambda _: runner(), range(2)))

    def test_two_simultaneous_outputs_never_create_negative_stock(self):
        item_id = self.item.id
        user_id = self.user.id

        def consume():
            register_manual_movement(
                item=InventoryItem.objects.get(pk=item_id),
                user=User.objects.get(pk=user_id),
                payload={"quantity": Decimal("6.00"), "reason": "Prueba concurrente"},
                movement_type=InventoryMovement.Type.SALIDA,
            )

        outcomes = self.run_parallel(consume)
        self.item.refresh_from_db()
        self.assertEqual(sorted(outcomes), ["blocked", "ok"])
        self.assertEqual(self.item.stock_current, Decimal("4.00"))
        self.assertEqual(InventoryMovement.objects.filter(item=self.item).count(), 1)

    def test_two_simultaneous_receipts_cannot_exceed_pending_quantity(self):
        order = PurchaseOrder.objects.create(clinic=self.clinic, supplier=self.supplier, created_by=self.user, status=PurchaseOrder.Status.APROBADA)
        line = PurchaseOrderItem.objects.create(purchase_order=order, item=self.item, quantity_ordered=Decimal("10.00"), unit_cost=Decimal("2.00"))
        order_id = order.id
        line_id = line.id
        user_id = self.user.id

        def receive():
            receive_purchase_order(
                order=PurchaseOrder.objects.get(pk=order_id),
                user=User.objects.get(pk=user_id),
                data={"items": [{"purchase_order_item": line_id, "quantity_received": Decimal("6.00"), "unit_cost": Decimal("2.00")}]},
            )

        outcomes = self.run_parallel(receive)
        line.refresh_from_db()
        self.item.refresh_from_db()
        self.assertEqual(sorted(outcomes), ["blocked", "ok"])
        self.assertEqual(line.quantity_received, Decimal("6.00"))
        self.assertEqual(self.item.stock_current, Decimal("16.00"))
        self.assertEqual(InventoryMovement.objects.filter(item=self.item, reference_type="purchase_receipt").count(), 1)
