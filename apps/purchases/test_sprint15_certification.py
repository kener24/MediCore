from datetime import timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.audit.models import AuditLog
from apps.clinics.models import Clinic
from apps.inventory.models import InventoryCategory, InventoryItem, InventoryMovement
from apps.purchases.models import PurchaseOrder, PurchaseOrderItem, PurchaseReceipt, PurchaseReturn, Supplier


class PurchaseSprint15CertificationTests(APITestCase):
    def setUp(self):
        admin_role = Role.objects.create(nombre="admin")
        nurse_role = Role.objects.create(nombre="enfermera")
        self.clinic = Clinic.objects.create(nombre="Clinica compras")
        self.other_clinic = Clinic.objects.create(nombre="Clinica ajena")
        self.admin = User.objects.create_user(email="purchase-admin@test.com", password="Test12345*", role=admin_role, clinica=self.clinic)
        self.other_admin = User.objects.create_user(email="other-admin@test.com", password="Test12345*", role=admin_role, clinica=self.other_clinic)
        self.nurse = User.objects.create_user(email="purchase-nurse@test.com", password="Test12345*", role=nurse_role, clinica=self.clinic)
        category = InventoryCategory.objects.create(clinic=self.clinic, name="Medicamentos")
        self.item = InventoryItem.objects.create(
            clinic=self.clinic,
            category=category,
            name="Compra certificada",
            sku="COMPRA-15",
            unit="unidad",
            requires_lot=True,
            requires_expiration=True,
        )
        self.supplier = Supplier.objects.create(clinic=self.clinic, name="Proveedor certificado")

    def create_order(self, quantity="10.00", approved=True):
        order = PurchaseOrder.objects.create(clinic=self.clinic, supplier=self.supplier, created_by=self.admin)
        line = PurchaseOrderItem.objects.create(
            purchase_order=order,
            item=self.item,
            quantity_ordered=Decimal(quantity),
            unit_cost=Decimal("5.00"),
        )
        if approved:
            order.status = PurchaseOrder.Status.APROBADA
            order.approved_by = self.admin
            order.approved_at = timezone.now()
            order.save(update_fields=["status", "approved_by", "approved_at", "actualizado_en"])
        return order, line

    def receive(self, order, line, quantity, lot_number, key=None):
        payload = {
            "receipt_date": str(timezone.localdate()),
            "items": [{
                "purchase_order_item": line.id,
                "quantity_received": str(quantity),
                "unit_cost": "5.00",
                "lot_number": lot_number,
                "expiration_date": str(timezone.localdate() + timedelta(days=365)),
            }],
        }
        if key:
            payload["idempotency_key"] = key
        return self.client.post(f"/api/purchases/orders/{order.id}/receive/", payload, format="json")

    def test_receipt_requires_approval_and_blocks_unauthorized_roles(self):
        order, line = self.create_order(approved=False)
        self.client.force_authenticate(self.admin)
        response = self.receive(order, line, "1", "NO-APPROVAL")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.client.force_authenticate(self.nurse)
        self.assertEqual(self.client.get("/api/purchases/orders/").status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.receive(order, line, "1", "NO-PERMISSION").status_code, status.HTTP_403_FORBIDDEN)

    def test_partial_and_total_receipts_are_idempotent(self):
        order, line = self.create_order()
        self.client.force_authenticate(self.admin)
        first = self.receive(order, line, "4", "LOT-A", key="receipt-op-001")
        self.assertEqual(first.status_code, status.HTTP_201_CREATED, first.content)
        replay = self.receive(order, line, "4", "LOT-A", key="receipt-op-001")
        self.assertEqual(replay.status_code, status.HTTP_200_OK, replay.content)
        self.assertEqual(first.data["id"], replay.data["id"])
        self.assertEqual(PurchaseReceipt.objects.count(), 1)
        self.assertEqual(InventoryMovement.objects.filter(reference_type="purchase_receipt").count(), 1)
        line.refresh_from_db()
        order.refresh_from_db()
        self.item.refresh_from_db()
        self.assertEqual(line.quantity_received, Decimal("4.00"))
        self.assertEqual(order.status, PurchaseOrder.Status.RECIBIDA_PARCIAL)
        self.assertEqual(self.item.stock_current, Decimal("4.00"))

        second = self.receive(order, line, "6", "LOT-B", key="receipt-op-002")
        self.assertEqual(second.status_code, status.HTTP_201_CREATED, second.content)
        line.refresh_from_db()
        order.refresh_from_db()
        self.item.refresh_from_db()
        self.assertEqual(line.pending_quantity, Decimal("0.00"))
        self.assertEqual(order.status, PurchaseOrder.Status.RECIBIDA)
        self.assertEqual(self.item.stock_current, Decimal("10.00"))

    def test_one_receipt_supports_multiple_lots_and_rejects_duplicates(self):
        order, line = self.create_order()
        self.client.force_authenticate(self.admin)
        expiration = str(timezone.localdate() + timedelta(days=365))
        response = self.client.post(
            f"/api/purchases/orders/{order.id}/receive/",
            {"items": [
                {"purchase_order_item": line.id, "quantity_received": "4", "lot_number": "MULTI-A", "expiration_date": expiration},
                {"purchase_order_item": line.id, "quantity_received": "6", "lot_number": "MULTI-B", "expiration_date": expiration},
            ]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        self.assertEqual(len(response.data["items"]), 2)
        self.assertEqual(InventoryMovement.objects.filter(reference_type="purchase_receipt").count(), 2)

        duplicate_order, duplicate_line = self.create_order()
        duplicate = self.client.post(
            f"/api/purchases/orders/{duplicate_order.id}/receive/",
            {"items": [
                {"purchase_order_item": duplicate_line.id, "quantity_received": "2", "lot_number": "DUP", "expiration_date": expiration},
                {"purchase_order_item": duplicate_line.id, "quantity_received": "2", "lot_number": "DUP", "expiration_date": expiration},
            ]},
            format="json",
        )
        self.assertEqual(duplicate.status_code, status.HTTP_400_BAD_REQUEST)

    def test_expired_and_excess_receipts_are_rejected_without_stock_change(self):
        order, line = self.create_order()
        self.client.force_authenticate(self.admin)
        expired = self.client.post(
            f"/api/purchases/orders/{order.id}/receive/",
            {"items": [{
                "purchase_order_item": line.id,
                "quantity_received": "1",
                "lot_number": "EXPIRED",
                "expiration_date": str(timezone.localdate() - timedelta(days=1)),
            }]},
            format="json",
        )
        self.assertEqual(expired.status_code, status.HTTP_400_BAD_REQUEST)
        excess = self.receive(order, line, "11", "EXCESS")
        self.assertEqual(excess.status_code, status.HTTP_400_BAD_REQUEST)
        self.item.refresh_from_db()
        self.assertEqual(self.item.stock_current, Decimal("0.00"))
        self.assertFalse(PurchaseReceipt.objects.exists())

    def test_supplier_return_preserves_receipt_and_reopens_order(self):
        order, line = self.create_order()
        self.client.force_authenticate(self.admin)
        received = self.receive(order, line, "10", "RETURN", key="receive-return")
        receipt_item = received.data["items"][0]
        payload = {"reason": "Producto danado al inspeccionar", "idempotency_key": "return-op-001", "items": [{"receipt_item": receipt_item["id"], "quantity": "3"}]}
        returned = self.client.post(f"/api/purchases/receipts/{received.data['id']}/return-items/", payload, format="json")
        self.assertEqual(returned.status_code, status.HTTP_201_CREATED, returned.content)
        replay = self.client.post(f"/api/purchases/receipts/{received.data['id']}/return-items/", payload, format="json")
        self.assertEqual(replay.status_code, status.HTTP_200_OK)
        self.assertEqual(PurchaseReturn.objects.count(), 1)
        self.assertTrue(PurchaseReceipt.objects.filter(pk=received.data["id"], active=True).exists())
        self.item.refresh_from_db()
        line.refresh_from_db()
        order.refresh_from_db()
        self.assertEqual(self.item.stock_current, Decimal("7.00"))
        self.assertEqual(line.quantity_received, Decimal("7.00"))
        self.assertEqual(order.status, PurchaseOrder.Status.RECIBIDA_PARCIAL)
        self.assertEqual(InventoryMovement.objects.filter(movement_type=InventoryMovement.Type.DEVOLUCION_PROVEEDOR).count(), 1)
        self.assertTrue(AuditLog.objects.filter(model_name="PurchaseReturn", action=AuditLog.Action.STOCK_OUT).exists())

    def test_full_reversal_creates_inverse_movement_and_restores_pending(self):
        order, line = self.create_order()
        self.client.force_authenticate(self.admin)
        received = self.receive(order, line, "4", "REVERSE")
        response = self.client.post(
            f"/api/purchases/receipts/{received.data['id']}/reverse/",
            {"reason": "Recepcion capturada por error"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.item.refresh_from_db()
        line.refresh_from_db()
        order.refresh_from_db()
        self.assertEqual(self.item.stock_current, Decimal("0.00"))
        self.assertEqual(line.quantity_received, Decimal("0.00"))
        self.assertEqual(order.status, PurchaseOrder.Status.APROBADA)
        inverse = InventoryMovement.objects.get(movement_type=InventoryMovement.Type.REVERSION)
        self.assertIsNotNone(inverse.reversed_movement_id)

    def test_reversal_is_blocked_after_stock_was_consumed(self):
        order, line = self.create_order()
        self.client.force_authenticate(self.admin)
        received = self.receive(order, line, "4", "USED")
        lot_id = received.data["items"][0]["lot"]
        InventoryMovement.objects.create(
            clinic=self.clinic,
            item=self.item,
            lot_id=lot_id,
            movement_type=InventoryMovement.Type.SALIDA,
            quantity=Decimal("1.00"),
            reason="Consumo clinico",
            performed_by=self.admin,
        )
        response = self.client.post(
            f"/api/purchases/receipts/{received.data['id']}/reverse/",
            {"reason": "Intento de reversion total"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.item.refresh_from_db()
        self.assertEqual(self.item.stock_current, Decimal("3.00"))

    def test_cross_clinic_order_receipt_and_return_are_hidden(self):
        order, line = self.create_order()
        self.client.force_authenticate(self.admin)
        received = self.receive(order, line, "2", "PRIVATE")
        self.client.force_authenticate(self.other_admin)
        self.assertEqual(self.client.get(f"/api/purchases/orders/{order.id}/").status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.post(f"/api/purchases/orders/{order.id}/receive/", {"items": []}, format="json").status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.get(f"/api/purchases/receipts/{received.data['id']}/").status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.get("/api/purchases/returns/").data, [])

    def test_receipt_and_return_records_cannot_be_silently_changed_or_deleted(self):
        order, line = self.create_order()
        self.client.force_authenticate(self.admin)
        received = self.receive(order, line, "2", "IMMUTABLE")
        receipt = PurchaseReceipt.objects.get(pk=received.data["id"])
        receipt_item = receipt.items.get()
        receipt_item.quantity_received = Decimal("1.00")
        with self.assertRaises(ValidationError):
            receipt_item.save()
