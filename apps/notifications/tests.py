from datetime import date, time, timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.appointments.models import Appointment
from apps.doctors.models import DoctorProfile, DoctorSchedule, MedicalSpecialty
from apps.inventory.models import InventoryCategory, InventoryItem
from apps.notifications.generators import generate_inventory_alerts
from apps.notifications.models import Notification, NotificationPreference
from apps.notifications.services import create_notification
from apps.patients.models import Patient
from apps.clinics.models import Clinic


def weekday_name(value):
    return ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"][value.weekday()]


class NotificationTests(APITestCase):
    def setUp(self):
        self.role_admin = Role.objects.create(nombre="admin")
        self.role_doctor = Role.objects.create(nombre="medico")
        self.role_patient = Role.objects.create(nombre="paciente")
        self.clinic = Clinic.objects.create(nombre="Demo", correo="demo@test.com", telefono="1", direccion="Demo")
        self.admin = User.objects.create_user(email="admin@test.com", password="x", nombre_completo="Admin", role=self.role_admin, clinica=self.clinic)
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

    def test_unauthenticated_cannot_access(self):
        self.assertEqual(self.client.get("/api/notifications/").status_code, 401)
