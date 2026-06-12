from decimal import Decimal

from django.utils import timezone
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.billing.models import Invoice, InvoiceItem, Payment
from apps.clinics.models import Clinic
from apps.doctors.models import DoctorProfile, MedicalSpecialty
from apps.inventory.models import InventoryCategory, InventoryItem
from apps.patients.models import Patient
from apps.purchases.models import PurchaseOrder, PurchaseOrderItem, Supplier


class ReportsApiTests(APITestCase):
    def setUp(self):
        self.admin_role = Role.objects.create(nombre="admin")
        self.super_role = Role.objects.create(nombre="superadmin")
        self.doctor_role = Role.objects.create(nombre="medico")
        self.reception_role = Role.objects.create(nombre="recepcionista")
        self.patient_role = Role.objects.create(nombre="paciente")
        self.clinic = Clinic.objects.create(nombre="Demo", correo="demo@test.com", telefono="1", direccion="Demo")
        self.other_clinic = Clinic.objects.create(nombre="Otra", correo="otra@test.com", telefono="2", direccion="Otra")
        self.admin = User.objects.create_user(email="admin@test.com", password="x", nombre_completo="Admin", role=self.admin_role, clinica=self.clinic)
        self.superadmin = User.objects.create_user(email="super@test.com", password="x", nombre_completo="Super", role=self.super_role, is_superuser=True, is_staff=True)
        self.doctor_user = User.objects.create_user(email="doctor@test.com", password="x", nombre_completo="Doctor", role=self.doctor_role, clinica=self.clinic)
        self.reception = User.objects.create_user(email="rec@test.com", password="x", nombre_completo="Recepcion", role=self.reception_role, clinica=self.clinic)
        self.patient_user = User.objects.create_user(email="patient@test.com", password="x", nombre_completo="Paciente", role=self.patient_role, clinica=self.clinic)
        self.specialty = MedicalSpecialty.objects.create(nombre="General")
        self.doctor = DoctorProfile.objects.create(clinic=self.clinic, user=self.doctor_user, specialty=self.specialty, numero_colegiacion="MED-1")
        self.patient = Patient.objects.create(clinic=self.clinic, nombres="Ana", apellidos="Lopez", genero="femenino")
        self.category = InventoryCategory.objects.create(clinic=self.clinic, name="Medicamento")
        self.item = InventoryItem.objects.create(clinic=self.clinic, category=self.category, name="Acetaminofen", sku="MED-1", stock_current=Decimal("2"), stock_minimum=Decimal("5"), cost_price=Decimal("10"))
        self.supplier = Supplier.objects.create(clinic=self.clinic, name="Drogueria Central")

    def auth(self, user):
        self.client.force_authenticate(user=user)

    def test_admin_can_see_clinic_dashboard_and_patient_cannot(self):
        self.auth(self.admin)
        response = self.client.get("/api/reports/clinic-dashboard/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("summary", response.json())
        self.auth(self.patient_user)
        self.assertEqual(self.client.get("/api/reports/clinic-dashboard/").status_code, 403)

    def test_invalid_date_range_returns_error(self):
        self.auth(self.admin)
        response = self.client.get("/api/reports/appointments/?date_from=2026-06-30&date_to=2026-06-01")
        self.assertEqual(response.status_code, 400)

    def test_superadmin_can_see_global_dashboard(self):
        self.auth(self.superadmin)
        response = self.client.get("/api/reports/superadmin-dashboard/")
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(response.json()["summary"]["total_clinics"], 2)

    def test_financial_report_totals(self):
        invoice = Invoice.objects.create(clinic=self.clinic, patient=self.patient, created_by=self.admin)
        InvoiceItem.objects.create(invoice=invoice, description="Consulta", quantity=1, unit_price=Decimal("500.00"))
        Payment.objects.create(invoice=invoice, amount=Decimal("200.00"), method=Payment.Method.EFECTIVO, received_by=self.admin)
        self.auth(self.admin)
        response = self.client.get("/api/reports/financial/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["total_invoiced"], 500.0)
        self.assertEqual(response.json()["total_paid"], 200.0)

    def test_doctor_cannot_see_financial_report_but_can_see_own_dashboard(self):
        self.auth(self.doctor_user)
        self.assertEqual(self.client.get("/api/reports/financial/").status_code, 403)
        self.assertEqual(self.client.get("/api/reports/doctor-dashboard/").status_code, 200)

    def test_receptionist_can_see_reception_dashboard(self):
        self.auth(self.reception)
        response = self.client.get("/api/reports/reception-dashboard/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("appointments_today", response.json())

    def test_inventory_report_detects_low_stock(self):
        self.auth(self.admin)
        response = self.client.get("/api/reports/inventory/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["low_stock_items"], 1)

    def test_purchases_report_groups_by_supplier(self):
        order = PurchaseOrder.objects.create(clinic=self.clinic, supplier=self.supplier, created_by=self.admin, order_date=timezone.localdate())
        PurchaseOrderItem.objects.create(purchase_order=order, item=self.item, quantity_ordered=Decimal("3"), unit_cost=Decimal("10"))
        order.recalculate()
        self.auth(self.admin)
        response = self.client.get("/api/reports/purchases/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["total_purchase_orders"], 1)
        self.assertEqual(response.json()["purchases_by_supplier"][0]["supplier_name"], "Drogueria Central")

    def test_unauthenticated_user_cannot_access_reports(self):
        response = self.client.get("/api/reports/clinic-dashboard/")
        self.assertEqual(response.status_code, 401)
