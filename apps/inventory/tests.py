from decimal import Decimal
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.clinics.models import Clinic
from apps.inventory.models import InventoryCategory, InventoryItem, InventoryLot, InventoryMovement


class InventoryModuleTests(APITestCase):
    def setUp(self):
        self.roles = {name: Role.objects.create(nombre=name) for name in ["admin", "medico", "enfermera", "paciente"]}
        self.clinic = Clinic.objects.create(nombre="Clinica Demo")
        self.other = Clinic.objects.create(nombre="Otra")
        self.admin = User.objects.create_user(email="admin@x.com", password="x", role=self.roles["admin"], clinica=self.clinic)
        self.doctor = User.objects.create_user(email="doc@x.com", password="x", role=self.roles["medico"], clinica=self.clinic)
        self.nurse = User.objects.create_user(email="nurse@x.com", password="x", role=self.roles["enfermera"], clinica=self.clinic)
        self.patient = User.objects.create_user(email="pat@x.com", password="x", role=self.roles["paciente"], clinica=self.clinic)
        self.cat = InventoryCategory.objects.create(clinic=self.clinic, name="Medicamento")

    def auth(self, user):
        self.client.force_authenticate(user=user)

    def item(self, **kwargs):
        data = {"clinic": self.clinic, "category": self.cat, "name": "Ibuprofeno", "sku": "IBU", "item_type": "medicamento", "unit": "tableta", "requires_lot": True, "requires_expiration": True, "stock_minimum": 5}
        data.update(kwargs)
        return InventoryItem.objects.create(**data)

    def test_admin_crea_categoria(self):
        self.auth(self.admin)
        res = self.client.post("/api/inventory/categories/", {"name": "Insumo"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_admin_crea_producto(self):
        self.auth(self.admin)
        res = self.client.post("/api/inventory/items/", {"category": self.cat.id, "name": "Acetaminofen", "sku": "ACET", "item_type": "medicamento", "unit": "tableta"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_precio_negativo_no_permitido(self):
        self.auth(self.admin)
        res = self.client.post("/api/inventory/items/", {"category": self.cat.id, "name": "X", "item_type": "otro", "unit": "unidad", "cost_price": "-1"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_sku_unico(self):
        self.item()
        self.auth(self.admin)
        res = self.client.post("/api/inventory/items/", {"category": self.cat.id, "name": "Otro", "sku": "IBU", "item_type": "medicamento", "unit": "tableta"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_vencimiento_obligatorio(self):
        item = self.item()
        self.auth(self.admin)
        res = self.client.post("/api/inventory/lots/", {"item": item.id, "lot_number": "L1"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_entrada_y_salida_actualizan_stock(self):
        item = self.item()
        lot = InventoryLot.objects.create(item=item, lot_number="L1", expiration_date=timezone.localdate() + timezone.timedelta(days=90))
        InventoryMovement.objects.create(item=item, lot=lot, movement_type="entrada", quantity=10, reason="Compra", performed_by=self.admin)
        item.refresh_from_db(); lot.refresh_from_db()
        self.assertEqual(item.stock_current, Decimal("10.00"))
        InventoryMovement.objects.create(item=item, lot=lot, movement_type="salida", quantity=3, reason="Uso", performed_by=self.nurse)
        item.refresh_from_db(); lot.refresh_from_db()
        self.assertEqual(item.stock_current, Decimal("7.00"))
        self.assertEqual(lot.quantity_current, Decimal("7.00"))

    def test_no_salida_mayor_stock(self):
        item = self.item(stock_current=0)
        with self.assertRaises(Exception):
            InventoryMovement.objects.create(item=item, movement_type="salida", quantity=1, reason="Uso")

    def test_low_stock(self):
        self.item(stock_current=2, stock_minimum=5)
        self.auth(self.admin)
        res = self.client.get("/api/inventory/alerts/low-stock/")
        self.assertEqual(len(res.data), 1)

    def test_expiring_soon(self):
        item = self.item()
        InventoryLot.objects.create(item=item, lot_number="L1", expiration_date=timezone.localdate() + timezone.timedelta(days=10))
        self.auth(self.admin)
        res = self.client.get("/api/inventory/alerts/expiring-soon/")
        self.assertEqual(len(res.data), 1)

    def test_medico_consulta(self):
        self.item()
        self.auth(self.doctor)
        res = self.client.get("/api/inventory/items/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_paciente_no_accede(self):
        self.auth(self.patient)
        res = self.client.get("/api/inventory/items/")
        self.assertEqual(len(res.data), 0)

    def test_sin_auth(self):
        res = self.client.get("/api/inventory/items/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
