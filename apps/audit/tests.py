from datetime import date, time
from decimal import Decimal

from django.utils import timezone
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.appointments.models import Appointment
from apps.audit.models import AuditLog
from apps.audit.services import log_audit_event, mask_sensitive
from apps.billing.models import Invoice, InvoiceItem
from apps.clinics.models import Clinic
from apps.doctors.models import DoctorProfile, DoctorSchedule, MedicalSpecialty
from apps.inventory.models import InventoryCategory, InventoryItem
from apps.patients.models import Patient
from apps.purchases.models import PurchaseOrder, PurchaseOrderItem, Supplier


class AuditTests(APITestCase):
    def setUp(self):
        self.role_admin = Role.objects.create(nombre="admin")
        self.role_super = Role.objects.create(nombre="superadmin")
        self.role_patient = Role.objects.create(nombre="paciente")
        self.role_doctor = Role.objects.create(nombre="medico")
        self.clinic = Clinic.objects.create(nombre="Demo", correo="demo@test.com", telefono="1", direccion="Demo")
        self.other_clinic = Clinic.objects.create(nombre="Otra", correo="otra@test.com", telefono="2", direccion="Otra")
        self.admin = User.objects.create_user(email="admin@test.com", password="Admin12345*", nombre_completo="Admin", role=self.role_admin, clinica=self.clinic)
        self.other_admin = User.objects.create_user(email="other@test.com", password="Admin12345*", nombre_completo="Other", role=self.role_admin, clinica=self.other_clinic)
        self.superadmin = User.objects.create_user(email="super@test.com", password="Admin12345*", nombre_completo="Super", role=self.role_super, is_superuser=True, is_staff=True)
        self.patient_user = User.objects.create_user(email="patient@test.com", password="Admin12345*", nombre_completo="Paciente", role=self.role_patient, clinica=self.clinic)
        self.doctor_user = User.objects.create_user(email="doctor@test.com", password="Admin12345*", nombre_completo="Doctor", role=self.role_doctor, clinica=self.clinic)
        self.specialty = MedicalSpecialty.objects.create(nombre="General")
        self.doctor = DoctorProfile.objects.create(clinic=self.clinic, user=self.doctor_user, specialty=self.specialty, numero_colegiacion="MED-1")
        DoctorSchedule.objects.create(doctor=self.doctor, dia_semana="lunes", hora_inicio=time(8), hora_fin=time(17))
        self.patient = Patient.objects.create(clinic=self.clinic, nombres="Ana", apellidos="Lopez")
        self.category = InventoryCategory.objects.create(clinic=self.clinic, name="Medicamento")
        self.item = InventoryItem.objects.create(clinic=self.clinic, category=self.category, name="Acetaminofen", sku="MED-1", cost_price=Decimal("5.00"), requires_lot=True, requires_expiration=True)
        self.supplier = Supplier.objects.create(clinic=self.clinic, name="Drogueria Central")

    def auth(self, user):
        self.client.force_authenticate(user=user)

    def test_log_audit_event_creates_event_and_masks_sensitive_fields(self):
        log = log_audit_event(user=self.admin, clinic=self.clinic, action="update", module="users", new_values={"password": "secret", "name": "Admin"})
        self.assertIsNotNone(log)
        self.assertEqual(log.new_values["password"], "********")
        self.assertEqual(mask_sensitive({"token": "abc", "nested": {"cvv": "123"}})["nested"]["cvv"], "********")

    def test_login_success_and_failed_generate_logs(self):
        response = self.client.post("/api/auth/login/", {"email": "admin@test.com", "password": "Admin12345*"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(AuditLog.objects.filter(action=AuditLog.Action.LOGIN_SUCCESS, module=AuditLog.Module.AUTH).exists())
        response = self.client.post("/api/auth/login/", {"email": "admin@test.com", "password": "bad"}, format="json")
        self.assertEqual(response.status_code, 401)
        self.assertTrue(AuditLog.objects.filter(action=AuditLog.Action.LOGIN_FAILED, severity=AuditLog.Severity.WARNING).exists())

    def test_create_patient_generates_log(self):
        self.auth(self.admin)
        response = self.client.post("/api/patients/", {"nombres": "Luis", "apellidos": "Mora", "genero": "masculino"}, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertTrue(AuditLog.objects.filter(action=AuditLog.Action.CREATE, module=AuditLog.Module.PATIENTS).exists())

    def test_cancel_appointment_generates_log(self):
        appointment = Appointment.objects.create(clinic=self.clinic, patient=self.patient, doctor=self.doctor, scheduled_date=date(2026, 6, 8), start_time=time(9), end_time=time(9, 30), reason="Control")
        self.auth(self.admin)
        response = self.client.patch(f"/api/appointments/{appointment.id}/cancel/", {"cancellation_reason": "No podra asistir"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(AuditLog.objects.filter(action=AuditLog.Action.CANCEL, module=AuditLog.Module.APPOINTMENTS).exists())

    def test_register_payment_generates_log(self):
        invoice = Invoice.objects.create(clinic=self.clinic, patient=self.patient, created_by=self.admin)
        InvoiceItem.objects.create(invoice=invoice, description="Consulta", quantity=1, unit_price=Decimal("300"))
        self.auth(self.admin)
        response = self.client.post("/api/billing/payments/", {"invoice": invoice.id, "amount": "100", "method": "efectivo"}, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertTrue(AuditLog.objects.filter(action=AuditLog.Action.PAYMENT, module=AuditLog.Module.PAYMENTS).exists())

    def test_stock_in_generates_log(self):
        self.auth(self.admin)
        response = self.client.post(f"/api/inventory/items/{self.item.id}/stock-in/", {"quantity": "2", "unit_cost": "5", "lot_number": "L1", "expiration_date": "2027-12-31", "reason": "Compra"}, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertTrue(AuditLog.objects.filter(action=AuditLog.Action.STOCK_IN, module=AuditLog.Module.INVENTORY).exists())

    def test_receive_purchase_generates_log(self):
        order = PurchaseOrder.objects.create(clinic=self.clinic, supplier=self.supplier, created_by=self.admin)
        item = PurchaseOrderItem.objects.create(purchase_order=order, item=self.item, quantity_ordered=Decimal("3"), unit_cost=Decimal("5"))
        self.auth(self.admin)
        response = self.client.post(f"/api/purchases/orders/{order.id}/receive/", {"items": [{"purchase_order_item": item.id, "quantity_received": "1", "unit_cost": "5", "lot_number": "LP", "expiration_date": "2027-12-31"}]}, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertTrue(AuditLog.objects.filter(action=AuditLog.Action.PURCHASE_RECEIVE, module=AuditLog.Module.PURCHASES).exists())

    def test_admin_scope_superadmin_scope_patient_denied_and_filters(self):
        AuditLog.objects.create(clinic=self.clinic, user=self.admin, action="create", module="patients", severity="info", description="Paciente creado")
        AuditLog.objects.create(clinic=self.other_clinic, user=self.other_admin, action="payment", module="payments", severity="warning", description="Pago")
        self.auth(self.admin)
        response = self.client.get("/api/audit/logs/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["count"], 1)
        response = self.client.get("/api/audit/logs/?module=payments")
        self.assertEqual(response.json()["count"], 0)
        self.auth(self.superadmin)
        response = self.client.get("/api/audit/logs/?action=create")
        self.assertEqual(response.json()["count"], 1)
        self.auth(self.patient_user)
        self.assertEqual(self.client.get("/api/audit/logs/").status_code, 403)

    def test_detail_is_read_only_and_stats_work(self):
        log = AuditLog.objects.create(clinic=self.clinic, user=self.admin, action="create", module="patients", severity="error", description="Evento")
        self.auth(self.admin)
        self.assertEqual(self.client.get(f"/api/audit/logs/{log.id}/").status_code, 200)
        self.assertEqual(self.client.patch(f"/api/audit/logs/{log.id}/", {"description": "x"}, format="json").status_code, 405)
        stats = self.client.get("/api/audit/stats/").json()
        self.assertEqual(stats["total_logs"], 1)
        self.assertEqual(stats["errors"], 1)

    def test_unauthenticated_cannot_access(self):
        self.assertEqual(self.client.get("/api/audit/logs/").status_code, 401)
