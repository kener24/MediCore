from decimal import Decimal

from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.clinics.models import Clinic
from apps.inventory.models import InventoryCategory, InventoryItem, InventoryMovement
from apps.purchases.models import PurchaseOrder, PurchaseOrderItem, Supplier


class PurchaseApiTests(APITestCase):
    def setUp(self):
        self.role_admin = Role.objects.create(nombre="admin")
        self.role_reception = Role.objects.create(nombre="recepcionista")
        self.role_patient = Role.objects.create(nombre="paciente")
        self.clinic = Clinic.objects.create(nombre="Demo", correo="demo@test.com", telefono="1", direccion="Demo")
        self.other_clinic = Clinic.objects.create(nombre="Otra", correo="otra@test.com", telefono="2", direccion="Otra")
        self.admin = User.objects.create_user(email="admin@test.com", password="Admin12345*", nombre_completo="Admin", role=self.role_admin, clinica=self.clinic)
        self.reception = User.objects.create_user(email="rec@test.com", password="Admin12345*", nombre_completo="Rec", role=self.role_reception, clinica=self.clinic)
        self.patient = User.objects.create_user(email="patient@test.com", password="Admin12345*", nombre_completo="Patient", role=self.role_patient, clinica=self.clinic)
        self.category = InventoryCategory.objects.create(clinic=self.clinic, name="Medicamento")
        self.item = InventoryItem.objects.create(clinic=self.clinic, category=self.category, name="Acetaminofen", sku="MED-1", item_type="medicamento", unit="tableta", cost_price=Decimal("2.00"), stock_current=Decimal("0.00"), requires_lot=True, requires_expiration=True)
        self.other_category = InventoryCategory.objects.create(clinic=self.other_clinic, name="Otra")
        self.other_item = InventoryItem.objects.create(clinic=self.other_clinic, category=self.other_category, name="Otro", sku="OTR-1")
        self.supplier = Supplier.objects.create(clinic=self.clinic, name="Drogueria Central", rtn="080119900001")
        self.other_supplier = Supplier.objects.create(clinic=self.other_clinic, name="Proveedor otra", rtn="080219900002")

    def auth(self, user):
        self.client.force_authenticate(user=user)

    def create_order(self):
        order = PurchaseOrder.objects.create(clinic=self.clinic, supplier=self.supplier, created_by=self.admin)
        PurchaseOrderItem.objects.create(purchase_order=order, item=self.item, quantity_ordered=Decimal("10.00"), unit_cost=Decimal("5.00"))
        order.recalculate()
        return order

    def test_admin_can_create_supplier_and_patient_cannot_access(self):
        self.auth(self.admin)
        response = self.client.post("/api/purchases/suppliers/", {"name": "FarmaSalud", "rtn": "080319900003"})
        self.assertEqual(response.status_code, 201, response.content)
        self.auth(self.patient)
        self.assertEqual(self.client.get("/api/purchases/suppliers/").status_code, 200)
        self.assertEqual(self.client.get("/api/purchases/suppliers/").json(), [])

    def test_rtn_is_unique_per_clinic(self):
        self.auth(self.admin)
        response = self.client.post("/api/purchases/suppliers/", {"name": "Duplicado", "rtn": "080119900001"})
        self.assertEqual(response.status_code, 400)

    def test_cannot_create_order_with_supplier_from_other_clinic(self):
        self.auth(self.admin)
        response = self.client.post("/api/purchases/orders/", {"supplier": self.other_supplier.id, "items": []}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_order_calculates_totals_and_rejects_other_clinic_product(self):
        self.auth(self.admin)
        response = self.client.post(
            "/api/purchases/orders/",
            {"supplier": self.supplier.id, "items": [{"item": self.item.id, "quantity_ordered": "2", "unit_cost": "10", "discount_amount": "1", "tax_rate": "15"}]},
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(response.json()["total_amount"], "21.85")
        order_id = response.json()["id"]
        response = self.client.post(f"/api/purchases/orders/{order_id}/items/", {"item": self.other_item.id, "quantity_ordered": "1", "unit_cost": "1"}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_admin_can_approve_and_receptionist_cannot(self):
        order = self.create_order()
        self.auth(self.reception)
        self.assertEqual(self.client.patch(f"/api/purchases/orders/{order.id}/approve/", {}).status_code, 403)
        self.auth(self.admin)
        response = self.client.patch(f"/api/purchases/orders/{order.id}/approve/", {})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "aprobada")

    def test_receive_products_updates_inventory_and_lot(self):
        order = self.create_order()
        order_item = order.items.first()
        self.auth(self.admin)
        response = self.client.post(
            f"/api/purchases/orders/{order.id}/receive/",
            {
                "receipt_date": str(timezone.localdate()),
                "items": [
                    {
                        "purchase_order_item": order_item.id,
                        "quantity_received": "4",
                        "unit_cost": "5",
                        "lot_number": "LOT-TEST",
                        "expiration_date": "2027-12-31",
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.item.refresh_from_db()
        order_item.refresh_from_db()
        order.refresh_from_db()
        self.assertEqual(self.item.stock_current, Decimal("4.00"))
        self.assertEqual(order_item.quantity_received, Decimal("4.00"))
        self.assertEqual(order.status, PurchaseOrder.Status.RECIBIDA_PARCIAL)
        self.assertTrue(InventoryMovement.objects.filter(item=self.item, reference_type="purchase_receipt").exists())

    def test_cannot_receive_more_than_pending_or_cancelled_order(self):
        order = self.create_order()
        order_item = order.items.first()
        self.auth(self.admin)
        response = self.client.post(f"/api/purchases/orders/{order.id}/receive/", {"items": [{"purchase_order_item": order_item.id, "quantity_received": "11", "unit_cost": "5", "lot_number": "L1", "expiration_date": "2027-12-31"}]}, format="json")
        self.assertEqual(response.status_code, 400)
        order.status = PurchaseOrder.Status.CANCELADA
        order.save()
        response = self.client.post(f"/api/purchases/orders/{order.id}/receive/", {"items": [{"purchase_order_item": order_item.id, "quantity_received": "1", "unit_cost": "5", "lot_number": "L1", "expiration_date": "2027-12-31"}]}, format="json")
        self.assertEqual(response.status_code, 400)
