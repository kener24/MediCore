from datetime import timedelta
from decimal import Decimal
from io import StringIO

from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.clinics.models import Clinic
from apps.inventory.models import InventoryCategory, InventoryItem, InventoryLot, InventoryMovement


class InventorySprint15CertificationTests(APITestCase):
    def setUp(self):
        self.admin_role = Role.objects.create(nombre="admin")
        self.doctor_role = Role.objects.create(nombre="medico")
        self.clinic = Clinic.objects.create(nombre="Clinica inventario")
        self.other_clinic = Clinic.objects.create(nombre="Clinica ajena")
        self.admin = User.objects.create_user(email="inventory-admin@test.com", password="Test12345*", role=self.admin_role, clinica=self.clinic)
        self.doctor = User.objects.create_user(email="inventory-doctor@test.com", password="Test12345*", role=self.doctor_role, clinica=self.clinic)
        self.category = InventoryCategory.objects.create(clinic=self.clinic, name="Medicamentos")
        self.other_category = InventoryCategory.objects.create(clinic=self.other_clinic, name="Otros")
        self.item = InventoryItem.objects.create(
            clinic=self.clinic,
            category=self.category,
            name="Medicamento FEFO",
            sku="FEFO-15",
            unit="unidad",
            requires_lot=True,
            requires_expiration=True,
            stock_current=Decimal("8.00"),
        )
        self.first_lot = InventoryLot.objects.create(
            clinic=self.clinic,
            item=self.item,
            lot_number="FEFO-A",
            expiration_date=timezone.localdate() + timedelta(days=10),
            quantity_current=Decimal("3.00"),
        )
        self.second_lot = InventoryLot.objects.create(
            clinic=self.clinic,
            item=self.item,
            lot_number="FEFO-B",
            expiration_date=timezone.localdate() + timedelta(days=40),
            quantity_current=Decimal("5.00"),
        )

    def test_manual_output_uses_fefo_and_is_idempotent(self):
        self.client.force_authenticate(self.admin)
        payload = {"quantity": "4.00", "reason": "Salida autorizada", "idempotency_key": "manual-fefo-001"}
        response = self.client.post(f"/api/inventory/items/{self.item.id}/stock-out/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        self.assertEqual(len(response.data["allocations"]), 2)
        self.assertEqual(response.data["allocations"][0]["lot_number"], "FEFO-A")
        self.first_lot.refresh_from_db()
        self.second_lot.refresh_from_db()
        self.item.refresh_from_db()
        self.assertEqual(self.first_lot.quantity_current, Decimal("0.00"))
        self.assertEqual(self.second_lot.quantity_current, Decimal("4.00"))
        self.assertEqual(self.item.stock_current, Decimal("4.00"))

        replay = self.client.post(f"/api/inventory/items/{self.item.id}/stock-out/", payload, format="json")
        self.assertEqual(replay.status_code, status.HTTP_200_OK)
        self.assertEqual(len(replay.data["allocations"]), 2)
        self.assertEqual(InventoryMovement.objects.filter(reference_id="manual-fefo-001").count(), 2)
        self.item.refresh_from_db()
        self.assertEqual(self.item.stock_current, Decimal("4.00"))

    def test_expired_lot_is_excluded_and_cannot_be_selected_for_consumption(self):
        expired = InventoryLot.objects.create(
            clinic=self.clinic,
            item=self.item,
            lot_number="EXP-15",
            expiration_date=timezone.localdate() - timedelta(days=1),
            quantity_current=Decimal("2.00"),
        )
        self.item.stock_current = Decimal("10.00")
        self.item.save(update_fields=["stock_current", "actualizado_en"])
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            f"/api/inventory/items/{self.item.id}/stock-out/",
            {"quantity": "1.00", "lot": expired.id, "reason": "Intento vencido"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("vencido", response.data["detail"].lower())

    def test_cross_clinic_lot_and_unauthorized_writes_are_blocked(self):
        other_item = InventoryItem.objects.create(clinic=self.other_clinic, category=self.other_category, name="Ajeno", requires_lot=True)
        self.client.force_authenticate(self.admin)
        response = self.client.post("/api/inventory/lots/", {"item": other_item.id, "lot_number": "AJENO"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        self.client.force_authenticate(self.doctor)
        self.assertEqual(self.client.patch(f"/api/inventory/items/{self.item.id}/", {"name": "Alterado"}, format="json").status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.post(f"/api/inventory/items/{self.item.id}/stock-in/", {"quantity": "1", "reason": "No autorizado", "lot_number": "X", "expiration_date": "2030-01-01"}, format="json").status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.delete(f"/api/inventory/categories/{self.category.id}/").status_code, status.HTTP_403_FORBIDDEN)

    def test_partial_product_update_keeps_category_and_lot_with_stock_cannot_be_disabled(self):
        self.client.force_authenticate(self.admin)
        response = self.client.patch(f"/api/inventory/items/{self.item.id}/", {"stock_minimum": "2.00"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        response = self.client.delete(f"/api/inventory/lots/{self.first_lot.id}/")
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    def test_lot_and_expiration_controls_cannot_be_changed_inconsistently(self):
        plain = InventoryItem.objects.create(clinic=self.clinic, category=self.category, name="Producto sin lote", stock_current=Decimal("2.00"))
        self.client.force_authenticate(self.admin)
        response = self.client.patch(f"/api/inventory/items/{plain.id}/", {"requires_lot": True}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        response = self.client.patch(f"/api/inventory/items/{plain.id}/", {"requires_expiration": True}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        response = self.client.patch(f"/api/inventory/items/{self.item.id}/", {"requires_lot": False, "requires_expiration": False}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_confirmed_movement_is_immutable_and_has_balances(self):
        movement = InventoryMovement.objects.create(
            clinic=self.clinic,
            item=self.item,
            lot=self.first_lot,
            movement_type=InventoryMovement.Type.SALIDA,
            quantity=Decimal("1.00"),
            reason="Consumo",
            performed_by=self.admin,
        )
        self.assertEqual(movement.balance_before, Decimal("8.00"))
        self.assertEqual(movement.balance_after, Decimal("7.00"))
        movement.reason = "Alterado"
        with self.assertRaises(ValidationError):
            movement.save()
        with self.assertRaises(ValidationError):
            movement.delete()

        self.client.force_authenticate(self.admin)
        response = self.client.post(
            "/api/inventory/movements/",
            {"item": self.item.id, "lot": self.second_lot.id, "movement_type": "salida", "quantity": "1", "reason": "Atajo no permitido"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_diagnostic_command_reports_mismatch_without_modifying_data(self):
        inconsistent = InventoryItem.objects.create(
            clinic=self.clinic,
            category=self.category,
            name="Inconsistente",
            requires_lot=True,
            stock_current=Decimal("2.00"),
        )
        output = StringIO()
        call_command("audit_inventory_consistency", clinic=self.clinic.id, as_json=True, stdout=output)
        self.assertIn("stock_lot_mismatch", output.getvalue())
        inconsistent.refresh_from_db()
        self.assertEqual(inconsistent.stock_current, Decimal("2.00"))
