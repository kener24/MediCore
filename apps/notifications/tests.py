from datetime import date, time, timedelta
from decimal import Decimal

from django.core import mail
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.appointments.models import Appointment
from apps.billing.models import CashSession, FiscalDocumentRange, Invoice
from apps.doctors.models import DoctorProfile, DoctorSchedule, MedicalSpecialty
from apps.inventory.models import InventoryCategory, InventoryItem
from apps.notifications.generators import generate_billing_alerts, generate_cash_alerts, generate_fiscal_range_alerts, generate_inventory_alerts
from apps.notifications.models import Notification, NotificationPreference, PushDevice
from apps.notifications.services import create_notification
from apps.patients.models import Patient
from apps.clinics.models import Clinic


def weekday_name(value):
    return ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"][value.weekday()]


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    DEFAULT_FROM_EMAIL="MediCore <no-reply@medicore.test>",
    EMAIL_REPLY_TO="soporte@medicore.test",
    FRONTEND_URL="https://medicore.test",
    EMAIL_NOTIFICATIONS_ENABLED=True,
    EMAIL_NOTIFICATION_MODULES=["appointments", "billing", "payments", "cash", "inventory", "purchases", "audit", "system"],
)
class NotificationTests(APITestCase):
    def setUp(self):
        self.role_admin = Role.objects.create(nombre="admin")
        self.role_doctor = Role.objects.create(nombre="medico")
        self.role_patient = Role.objects.create(nombre="paciente")
        self.role_reception = Role.objects.create(nombre="recepcionista")
        self.clinic = Clinic.objects.create(nombre="Demo", correo="demo@test.com", telefono="1", direccion="Demo")
        self.admin = User.objects.create_user(email="admin@test.com", password="x", nombre_completo="Admin", role=self.role_admin, clinica=self.clinic)
        self.reception = User.objects.create_user(email="recepcion@test.com", password="x", nombre_completo="Recepcion", role=self.role_reception, clinica=self.clinic)
        self.doctor_user = User.objects.create_user(email="doctor@test.com", password="x", nombre_completo="Doctor", role=self.role_doctor, clinica=self.clinic)
        self.patient_user = User.objects.create_user(email="patient@test.com", password="x", nombre_completo="Patient", role=self.role_patient, clinica=self.clinic)
        self.other_user = User.objects.create_user(email="other@test.com", password="x", nombre_completo="Other", role=self.role_admin, clinica=self.clinic)
        self.specialty = MedicalSpecialty.objects.create(nombre="General")
        self.doctor = DoctorProfile.objects.create(clinic=self.clinic, user=self.doctor_user, specialty=self.specialty, numero_colegiacion="MED-1")
        DoctorSchedule.objects.create(doctor=self.doctor, dia_semana="lunes", hora_inicio=time(8), hora_fin=time(17))
        self.patient = Patient.objects.create(clinic=self.clinic, user=self.patient_user, nombres="Ana", apellidos="Lopez")
        self.category = InventoryCategory.objects.create(clinic=self.clinic, name="Medicamento")
        self.item = InventoryItem.objects.create(clinic=self.clinic, category=self.category, name="Acetaminofen", sku="MED-1", stock_current=Decimal("1"), stock_minimum=Decimal("5"))

    def auth(self, user):
        self.client.force_authenticate(user=user)

    def test_create_notification_and_sensitive_metadata_mask(self):
        n = create_notification(self.admin, "Prueba", "Mensaje", clinic=self.clinic, metadata={"token": "abc", "safe": "ok"})
        self.assertIsNotNone(n)
        self.assertEqual(n.metadata["token"], "********")

    def test_email_notification_respects_channel_preference(self):
        preferences, _ = NotificationPreference.objects.get_or_create(user=self.admin)
        preferences.email_enabled = True
        preferences.save(update_fields=["email_enabled"])
        create_notification(self.admin, "Alerta de caja", "Revisa el cierre pendiente.", module="cash", priority="high", action_url="/clinic/billing/cash")
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Alerta de caja", mail.outbox[0].subject)
        self.assertIn("https://medicore.test/clinic/billing/cash", mail.outbox[0].body)

    def test_email_notification_is_not_sent_when_channel_is_disabled(self):
        create_notification(self.admin, "Alerta de caja", "Revisa el cierre pendiente.", module="cash", priority="high")
        self.assertEqual(len(mail.outbox), 0)

    def test_forced_security_email_bypasses_optional_preference(self):
        create_notification(self.admin, "Cuenta bloqueada", "Revisa la actividad de tu cuenta.", module="auth", priority="high", force_email=True)
        self.assertEqual(len(mail.outbox), 1)

    def test_user_sees_only_own_notifications(self):
        create_notification(self.admin, "Mia", "Mensaje")
        create_notification(self.other_user, "Otra", "Mensaje")
        self.auth(self.admin)
        response = self.client.get("/api/notifications/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["count"], 1)

    def test_user_cannot_view_other_notification(self):
        n = create_notification(self.other_user, "Otra", "Mensaje")
        self.auth(self.admin)
        self.assertEqual(self.client.get(f"/api/notifications/{n.id}/").status_code, 404)

    def test_mark_read_unread_all_and_archive(self):
        n1 = create_notification(self.admin, "Uno", "Mensaje")
        n2 = create_notification(self.admin, "Dos", "Mensaje")
        self.auth(self.admin)
        self.assertEqual(self.client.patch(f"/api/notifications/{n1.id}/mark-read/").json()["status"], "read")
        self.assertEqual(self.client.patch(f"/api/notifications/{n1.id}/mark-unread/").json()["status"], "unread")
        self.assertEqual(self.client.post("/api/notifications/mark-all-read/").json()["updated"], 2)
        self.assertEqual(self.client.patch(f"/api/notifications/{n2.id}/archive/").json()["status"], "archived")

    def test_unread_count_stats_and_filters(self):
        create_notification(self.admin, "Inventario", "Bajo stock", module="inventory", priority="high", notification_type="alert")
        create_notification(self.admin, "Cita", "Recordatorio", module="appointments", priority="normal", notification_type="reminder")
        self.auth(self.admin)
        self.assertEqual(self.client.get("/api/notifications/unread-count/").json()["unread_count"], 2)
        self.assertEqual(self.client.get("/api/notifications/?module=inventory").json()["count"], 1)
        self.assertEqual(self.client.get("/api/notifications/stats/").json()["unread"], 2)

    def test_preferences_and_patient_admin_alert_validation(self):
        self.auth(self.admin)
        self.assertEqual(self.client.get("/api/notifications/preferences/").status_code, 200)
        self.assertEqual(self.client.patch("/api/notifications/preferences/", {"receive_inventory_alerts": False}, format="json").status_code, 200)
        self.auth(self.patient_user)
        response = self.client.patch("/api/notifications/preferences/", {"receive_inventory_alerts": True}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_register_and_disable_push_device(self):
        self.auth(self.admin)
        payload = {
            "expo_push_token": "ExponentPushToken[demo123]",
            "platform": "android",
            "device_name": "Pixel demo",
            "app_version": "1.0.0",
        }
        response = self.client.post("/api/notifications/push-devices/", payload, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertTrue(PushDevice.objects.filter(user=self.admin, expo_push_token=payload["expo_push_token"], is_active=True).exists())
        self.assertTrue(NotificationPreference.objects.get(user=self.admin).push_enabled)
        self.assertEqual(self.client.get("/api/notifications/push-devices/").status_code, 200)
        response = self.client.delete("/api/notifications/push-devices/", {"expo_push_token": payload["expo_push_token"]}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(PushDevice.objects.get(expo_push_token=payload["expo_push_token"]).is_active)

    def test_reject_invalid_push_token(self):
        self.auth(self.admin)
        response = self.client.post("/api/notifications/push-devices/", {"expo_push_token": "bad-token"}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_appointment_create_and_cancel_generate_notifications(self):
        self.auth(self.admin)
        appointment_date = timezone.localdate() + timedelta(days=1)
        DoctorSchedule.objects.update_or_create(
            doctor=self.doctor,
            dia_semana=weekday_name(appointment_date),
            hora_inicio=time(8),
            hora_fin=time(17),
            defaults={"activo": True},
        )
        response = self.client.post("/api/appointments/", {"patient": self.patient.id, "doctor": self.doctor.id, "scheduled_date": appointment_date.isoformat(), "start_time": "09:00", "end_time": "09:30", "reason": "Control"}, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertTrue(Notification.objects.filter(recipient=self.doctor_user, module="appointments").exists())
        appointment_id = response.json()["id"]
        response = self.client.patch(f"/api/appointments/{appointment_id}/cancel/", {"cancellation_reason": "No podra asistir"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(Notification.objects.filter(title="Cita cancelada").exists())

    def test_low_stock_generates_admin_notification(self):
        created = generate_inventory_alerts()
        self.assertGreaterEqual(created, 1)
        self.assertTrue(Notification.objects.filter(recipient=self.admin, module="inventory").exists())
        self.assertEqual(generate_inventory_alerts(), 0)

    def test_billing_alerts_notify_patient_and_staff_without_duplicates(self):
        invoice = Invoice.objects.create(
            clinic=self.clinic,
            patient=self.patient,
            invoice_number="FAC-TEST-1",
            total_amount=Decimal("150.00"),
            balance_due=Decimal("150.00"),
            status=Invoice.Status.PENDIENTE,
        )
        created = generate_billing_alerts()
        self.assertGreaterEqual(created, 3)
        self.assertTrue(Notification.objects.filter(recipient=self.patient_user, title="Factura pendiente", related_object_id=str(invoice.id)).exists())
        self.assertTrue(Notification.objects.filter(recipient=self.admin, title="Factura pendiente", related_object_id=str(invoice.id)).exists())
        self.assertTrue(Notification.objects.filter(recipient=self.reception, title="Factura pendiente", related_object_id=str(invoice.id)).exists())
        self.assertEqual(generate_billing_alerts(), 0)

    def test_open_cash_session_generates_operational_alert(self):
        session = CashSession.objects.create(
            clinic=self.clinic,
            opened_by=self.reception,
            opening_datetime=timezone.now() - timedelta(hours=13),
            opening_amount=Decimal("100.00"),
        )
        created = generate_cash_alerts()
        self.assertEqual(created, 3)
        self.assertTrue(Notification.objects.filter(recipient=self.admin, title="Caja abierta sin cierre", related_object_id=str(session.id)).exists())
        self.assertTrue(Notification.objects.filter(recipient=self.reception, title="Caja abierta sin cierre", related_object_id=str(session.id)).exists())
        self.assertEqual(generate_cash_alerts(), 0)

    def test_fiscal_range_alerts_warn_expiring_or_low_stock_cai(self):
        fiscal_range = FiscalDocumentRange.objects.create(
            clinic=self.clinic,
            document_type=FiscalDocumentRange.DocumentType.INVOICE,
            cai="DEMO-CAI-NO-VALIDO",
            start_number=1,
            end_number=100,
            current_number=95,
            start_date=timezone.localdate(),
            expiration_date=timezone.localdate() + timedelta(days=10),
            is_active=True,
        )
        created = generate_fiscal_range_alerts()
        self.assertEqual(created, 2)
        notification = Notification.objects.get(recipient=self.admin, related_model="FiscalDocumentRange", related_object_id=str(fiscal_range.id))
        self.assertEqual(notification.title, "Rango CAI por vencer")
        self.assertIn("000-001-01-00000001", notification.message)
        self.assertEqual(generate_fiscal_range_alerts(), 0)

    def test_unauthenticated_cannot_access(self):
        self.assertEqual(self.client.get("/api/notifications/").status_code, 401)
