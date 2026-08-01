from datetime import timedelta

from django.core import mail
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.audit.models import AuditLog
from apps.clinics.models import Clinic
from apps.doctors.models import DoctorProfile, MedicalSpecialty
from apps.security.models import UserSession


@override_settings(
    PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"],
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    DEFAULT_FROM_EMAIL="MediCore <no-reply@medicore.test>",
    EMAIL_REPLY_TO="soporte@medicore.test",
    FRONTEND_URL="https://medicore.test",
)
class ClinicAdminCertificationTests(APITestCase):
    def setUp(self):
        self.roles = {name: Role.objects.create(nombre=name) for name in ["superadmin", "admin", "medico", "enfermera", "recepcionista", "paciente"]}
        self.clinic_a = Clinic.objects.create(nombre="Clínica A", correo="a@medicore.test")
        self.clinic_b = Clinic.objects.create(nombre="Clínica B", correo="b@medicore.test")
        self.admin_a = self.user("admin-a@medicore.test", "admin", self.clinic_a)
        self.admin_b = self.user("admin-b@medicore.test", "admin", self.clinic_b)
        self.worker_a = self.user("recepcion-a@medicore.test", "recepcionista", self.clinic_a)
        self.worker_b = self.user("recepcion-b@medicore.test", "recepcionista", self.clinic_b)
        self.superadmin = self.user("super@medicore.test", "superadmin", None)

    def user(self, email, role, clinic):
        return User.objects.create_user(
            email=email,
            password="Temporal123*",
            nombre_completo=email.split("@")[0].replace("-", " ").title(),
            role=self.roles[role],
            clinica=clinic,
        )

    def authenticate(self, user=None):
        self.client.force_authenticate(user=user or self.admin_a)

    def session(self, user, key):
        return UserSession.objects.create(
            user=user,
            session_key=key,
            refresh_token_hash=f"hash-{key}",
            ip_address="192.168.40.22",
            user_agent="MediCore Android",
            device_name="Android",
            last_activity_at=timezone.now(),
            expires_at=timezone.now() + timedelta(hours=2),
        )

    def test_dashboard_uses_authenticated_clinic_and_contains_private_aggregates_only(self):
        self.authenticate()
        response = self.client.get(f"/api/clinic-admin/dashboard/?clinic_id={self.clinic_b.id}&period=7d")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["clinic"]["id"], self.clinic_a.id)
        self.assertEqual(response.data["period"]["key"], "7d")
        self.assertIn("operation", response.data)
        self.assertIn("finance", response.data)
        self.assertIn("inventory", response.data)
        self.assertNotIn("diagnosis", response.data)
        self.assertTrue(AuditLog.objects.filter(clinic=self.clinic_a, model_name="ClinicAdminDashboard").exists())

    def test_dashboard_rejects_invalid_or_excessive_date_range(self):
        self.authenticate()
        response = self.client.get("/api/clinic-admin/dashboard/?period=custom&date_from=2025-01-01&date_to=2026-01-01")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_inactive_clinic_cannot_use_admin_module(self):
        self.clinic_a.activo = False
        self.clinic_a.save(update_fields=["activo"])
        self.authenticate()
        self.assertEqual(self.client.get("/api/clinic-admin/dashboard/").status_code, status.HTTP_403_FORBIDDEN)

    def test_user_list_is_scoped_safe_and_reports_active_session(self):
        self.session(self.worker_a, "session-a")
        self.authenticate()
        response = self.client.get("/api/clinic-admin/users/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        users = response.data["results"]
        self.assertEqual({item["clinica"] for item in users}, {self.clinic_a.id})
        self.assertNotIn(self.worker_b.id, {item["id"] for item in users})
        worker = next(item for item in users if item["id"] == self.worker_a.id)
        self.assertTrue(worker["has_active_session"])
        self.assertNotIn("is_superuser", worker)
        self.assertNotIn("last_login_ip", worker)

    def test_search_requires_two_characters(self):
        self.authenticate()
        response = self.client.get("/api/clinic-admin/users/?search=a")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("dos caracteres", str(response.data))

    def test_admin_role_catalog_does_not_expose_superadmin(self):
        self.authenticate()
        response = self.client.get("/api/roles/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn("superadmin", {item["nombre"] for item in response.data})

    def test_duplicate_user_is_conflict_and_forbidden_role_is_rejected(self):
        self.authenticate()
        duplicate = self.client.post("/api/clinic-admin/users/", {
            "email": self.worker_a.email,
            "password": "Temporal123*",
            "nombre_completo": "Duplicado",
            "role": "recepcionista",
        }, format="json")
        self.assertEqual(duplicate.status_code, status.HTTP_409_CONFLICT)
        forbidden = self.client.post("/api/clinic-admin/users/", {
            "email": "bad@medicore.test",
            "password": "Temporal123*",
            "nombre_completo": "Bad",
            "role": "superadmin",
        }, format="json")
        self.assertEqual(forbidden.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(AuditLog.objects.filter(clinic=self.clinic_a, action=AuditLog.Action.PERMISSION_DENIED, model_name="Role", status=AuditLog.Status.FAILED).exists())

    def test_deactivate_requires_reason_and_revokes_sessions(self):
        session = self.session(self.worker_a, "session-deactivate")
        self.authenticate()
        missing = self.client.patch(f"/api/clinic-admin/users/{self.worker_a.id}/deactivate/", {}, format="json")
        self.assertEqual(missing.status_code, status.HTTP_400_BAD_REQUEST)
        response = self.client.patch(f"/api/clinic-admin/users/{self.worker_a.id}/deactivate/", {"reason": "Fin de contrato"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.worker_a.refresh_from_db()
        session.refresh_from_db()
        self.assertFalse(self.worker_a.is_active)
        self.assertFalse(session.active)
        log = AuditLog.objects.filter(clinic=self.clinic_a, action=AuditLog.Action.DEACTIVATE, object_id=str(self.worker_a.id)).latest("created_at")
        self.assertNotIn("password", str(log.new_values).lower())
        self.assertEqual(log.metadata["sessions_revoked"], 1)

    def test_reactivate_does_not_restore_old_sessions(self):
        session = self.session(self.worker_a, "session-reactivate")
        session.active = False
        session.revoked_at = timezone.now()
        session.save(update_fields=["active", "revoked_at"])
        self.worker_a.is_active = False
        self.worker_a.save(update_fields=["is_active"])
        self.authenticate()
        response = self.client.patch(f"/api/clinic-admin/users/{self.worker_a.id}/activate/", {"reason": "Reingreso autorizado"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        session.refresh_from_db()
        self.assertFalse(session.active)

    def test_last_admin_cannot_change_role_or_be_deactivated(self):
        self.authenticate()
        role_change = self.client.patch(f"/api/clinic-admin/users/{self.admin_a.id}/", {"role": "recepcionista"}, format="json")
        self.assertEqual(role_change.status_code, status.HTTP_400_BAD_REQUEST)
        deactivate = self.client.patch(f"/api/clinic-admin/users/{self.admin_a.id}/deactivate/", {"reason": "Solicitud interna"}, format="json")
        self.assertEqual(deactivate.status_code, status.HTTP_400_BAD_REQUEST)

    def test_role_change_revokes_sessions(self):
        session = self.session(self.worker_a, "session-role")
        self.authenticate()
        response = self.client.patch(f"/api/clinic-admin/users/{self.worker_a.id}/", {"role": "enfermera"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        session.refresh_from_db()
        self.assertFalse(session.active)

    def test_password_reset_only_targets_own_active_user(self):
        self.authenticate()
        response = self.client.post(f"/api/clinic-admin/users/{self.worker_a.id}/reset-password/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertNotIn("token", response.data)
        cross = self.client.post(f"/api/clinic-admin/users/{self.worker_b.id}/reset-password/", {}, format="json")
        self.assertEqual(cross.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(AuditLog.objects.filter(clinic=self.clinic_a, action=AuditLog.Action.PERMISSION_DENIED, object_id=str(self.worker_b.id)).exists())

    def test_revoke_all_user_sessions_is_scoped_and_audited(self):
        first = self.session(self.worker_a, "session-all-a1")
        second = self.session(self.worker_a, "session-all-a2")
        external = self.session(self.worker_b, "session-all-b")
        self.authenticate()
        response = self.client.post(f"/api/clinic-admin/users/{self.worker_a.id}/revoke-sessions/", {"reason": "Dispositivo comprometido"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["sessions_revoked"], 2)
        first.refresh_from_db()
        second.refresh_from_db()
        external.refresh_from_db()
        self.assertFalse(first.active)
        self.assertFalse(second.active)
        self.assertTrue(external.active)
        cross = self.client.post(f"/api/clinic-admin/users/{self.worker_b.id}/revoke-sessions/", {"reason": "Intento cruzado"}, format="json")
        self.assertEqual(cross.status_code, status.HTTP_404_NOT_FOUND)

    def test_admin_session_list_masks_ip_and_cross_revoke_is_hidden(self):
        own = self.session(self.worker_a, "session-safe-a")
        other = self.session(self.worker_b, "session-safe-b")
        self.authenticate()
        response = self.client.get("/api/security/admin/sessions/?active=true")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual({item["id"] for item in response.data}, {own.id})
        self.assertEqual(response.data[0]["location_hint"], "192.168.x.x")
        self.assertNotIn("ip_address", response.data[0])
        self.assertNotIn("user_agent", response.data[0])
        cross = self.client.patch(f"/api/security/admin/sessions/{other.id}/revoke/", {"reason": "Intento cruzado"}, format="json")
        self.assertEqual(cross.status_code, status.HTTP_404_NOT_FOUND)
        other.refresh_from_db()
        self.assertTrue(other.active)

    def test_alerts_and_operation_status_are_scoped(self):
        self.authenticate()
        alerts = self.client.get("/api/clinic-admin/alerts/")
        operation = self.client.get("/api/clinic-admin/operation-status/")
        self.assertEqual(alerts.status_code, status.HTTP_200_OK)
        self.assertEqual(operation.status_code, status.HTTP_200_OK)
        self.assertEqual(operation.data["clinic"]["id"], self.clinic_a.id)
        self.assertTrue(all("cai" not in item for item in alerts.data["results"]))

    def test_doctor_schedule_is_scoped_validated_and_audited(self):
        specialty = MedicalSpecialty.objects.create(nombre="Medicina familiar")
        doctor_a_user = self.user("doctor-a@medicore.test", "medico", self.clinic_a)
        doctor_b_user = self.user("doctor-b@medicore.test", "medico", self.clinic_b)
        doctor_a = DoctorProfile.objects.create(clinic=self.clinic_a, user=doctor_a_user, specialty=specialty, numero_colegiacion="A-100")
        doctor_b = DoctorProfile.objects.create(clinic=self.clinic_b, user=doctor_b_user, specialty=specialty, numero_colegiacion="B-100")
        self.authenticate()
        created = self.client.post(f"/api/doctors/{doctor_a.id}/schedules/", {"dia_semana": "lunes", "hora_inicio": "08:00", "hora_fin": "12:00"}, format="json")
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        overlap = self.client.post(f"/api/doctors/{doctor_a.id}/schedules/", {"dia_semana": "lunes", "hora_inicio": "10:00", "hora_fin": "13:00"}, format="json")
        self.assertEqual(overlap.status_code, status.HTTP_400_BAD_REQUEST)
        cross = self.client.get(f"/api/doctors/{doctor_b.id}/schedules/")
        self.assertEqual(cross.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(AuditLog.objects.filter(clinic=self.clinic_a, model_name="DoctorSchedule", action=AuditLog.Action.CREATE).exists())
