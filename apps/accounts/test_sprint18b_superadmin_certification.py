from datetime import timedelta

from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import Role, User
from apps.accounts.superadmin_services import build_global_usage, build_superadmin_alerts
from apps.audit.models import AuditLog
from apps.clinic_settings.models import ClinicSettings, ClinicWorkflowSettings
from apps.clinics.models import Clinic
from apps.patients.models import Patient
from apps.security.models import UserSession
from apps.security.services import hash_token
from apps.subscriptions.models import ClinicSubscription, SubscriptionPlan


class SuperAdminSprint18BCertificationTests(APITestCase):
    password = "Certificacion18B*"

    def setUp(self):
        self.roles = {
            name: Role.objects.create(nombre=name)
            for name in ["superadmin", "admin", "medico", "enfermera", "recepcionista", "cajero", "paciente"]
        }
        self.plan = SubscriptionPlan.objects.create(
            name="Certificación",
            code="certificacion-18b",
            max_users=10,
            max_doctors=5,
            max_patients=100,
            allow_inventory=True,
            allow_purchases=True,
            allow_audit=True,
            allow_patient_portal=True,
        )
        self.clinic_a = Clinic.objects.create(nombre="Clínica A", correo="a@example.test")
        self.clinic_b = Clinic.objects.create(nombre="Clínica B", correo="b@example.test")
        for clinic in [self.clinic_a, self.clinic_b]:
            ClinicSubscription.objects.create(
                clinic=clinic,
                plan=self.plan,
                status=ClinicSubscription.Status.ACTIVE,
                billing_cycle=ClinicSubscription.BillingCycle.MONTHLY,
                start_date=timezone.localdate(),
                end_date=timezone.localdate() + timedelta(days=90),
            )
        self.superadmin = self.user("super-18b@example.test", "superadmin", None, is_superuser=True)
        self.admin_a = self.user("admin-a-18b@example.test", "admin", self.clinic_a)
        self.admin_b = self.user("admin-b-18b@example.test", "admin", self.clinic_b)
        self.doctor_a = self.user("doctor-a-18b@example.test", "medico", self.clinic_a)
        self.nurse_a = self.user("nurse-a-18b@example.test", "enfermera", self.clinic_a)
        self.reception_a = self.user("reception-a-18b@example.test", "recepcionista", self.clinic_a)
        self.cashier_a = self.user("cashier-a-18b@example.test", "cajero", self.clinic_a)
        self.patient_user = self.user("patient-a-18b@example.test", "paciente", self.clinic_a)
        self.patient = Patient.objects.create(
            clinic=self.clinic_a,
            user=self.patient_user,
            codigo_paciente="PAC-18B",
            nombres="Paciente",
            apellidos="Privado",
        )

    def user(self, email, role, clinic, **extra):
        return User.objects.create_user(
            email=email,
            password=self.password,
            nombre_completo=email.split("@")[0],
            role=self.roles[role],
            clinica=clinic,
            is_staff=extra.get("is_superuser", False),
            is_superuser=extra.get("is_superuser", False),
        )

    def auth(self, user):
        self.client.force_authenticate(user=user)

    def test_global_endpoints_require_superadmin_and_never_expose_patient_names(self):
        endpoints = [
            "/api/admin/dashboard/",
            "/api/admin/usage/",
            "/api/admin/alerts/",
            "/api/admin/system-status/",
            "/api/subscriptions/clinics/",
            "/api/audit/logs/",
        ]
        for user in [self.admin_a, self.doctor_a, self.nurse_a, self.reception_a, self.cashier_a, self.patient_user]:
            self.auth(user)
            for endpoint in endpoints[:5]:
                self.assertEqual(self.client.get(endpoint).status_code, status.HTTP_403_FORBIDDEN, (user.role.nombre, endpoint))
        self.assertTrue(
            AuditLog.objects.filter(
                action=AuditLog.Action.PERMISSION_DENIED,
                module=AuditLog.Module.SECURITY,
                status=AuditLog.Status.FAILED,
            ).exists()
        )

        self.auth(self.superadmin)
        for endpoint in endpoints:
            response = self.client.get(endpoint)
            self.assertEqual(response.status_code, status.HTTP_200_OK, endpoint)
            self.assertNotIn(self.patient.nombre_completo, str(response.data))

        dashboard = self.client.get("/api/admin/dashboard/")
        self.assertIn(self.plan.code, dashboard.data["subscriptions"]["plans_used"])
        with self.assertNumQueries(1):
            usage = build_global_usage()
        with self.assertNumQueries(1):
            alerts = build_superadmin_alerts()
        self.assertEqual(len(usage), 2)
        self.assertNotIn(self.patient.nombre_completo, str(alerts))

        invalid_range = self.client.get("/api/admin/dashboard/?date_from=2025-01-01&date_to=2026-12-31")
        self.assertEqual(invalid_range.status_code, status.HTTP_400_BAD_REQUEST)

    def test_clinic_creation_is_atomic_initialized_and_idempotent(self):
        self.auth(self.superadmin)
        payload = {
            "nombre": "Clínica Segura 18B",
            "rtn": "08011999123456",
            "telefono": "99998888",
            "correo": "segura18b@example.test",
            "direccion": "Tegucigalpa",
            "plan": self.plan.id,
        }
        first = self.client.post("/api/clinics/", payload, format="json", HTTP_IDEMPOTENCY_KEY="clinic-device-18b")
        self.assertEqual(first.status_code, status.HTTP_201_CREATED, first.data)
        clinic = Clinic.objects.get(nombre=payload["nombre"])
        self.assertTrue(ClinicSettings.objects.filter(clinic=clinic).exists())
        self.assertTrue(ClinicWorkflowSettings.objects.filter(clinic=clinic).exists())
        self.assertEqual(clinic.subscription.plan_id, self.plan.id)

        replay = self.client.post("/api/clinics/", payload, format="json", HTTP_IDEMPOTENCY_KEY="clinic-device-18b")
        self.assertEqual(replay.status_code, status.HTTP_200_OK)
        self.assertEqual(replay["X-Idempotent-Replay"], "true")
        self.assertEqual(Clinic.objects.filter(nombre=payload["nombre"]).count(), 1)

        duplicate = self.client.post("/api/clinics/", payload, format="json", HTTP_IDEMPOTENCY_KEY="clinic-other-tab-18b")
        self.assertEqual(duplicate.status_code, status.HTTP_409_CONFLICT)

        broken = {
            "nombre": "Clínica Incompleta 18B",
            "correo": "incompleta18b@example.test",
            "initial_admin": {"email": "missing-password@example.test", "nombre_completo": "Admin sin clave"},
        }
        failed = self.client.post("/api/clinics/", broken, format="json", HTTP_IDEMPOTENCY_KEY="clinic-broken-18b")
        self.assertEqual(failed.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Clinic.objects.filter(nombre=broken["nombre"]).exists())

    def test_suspension_is_tenant_safe_and_old_session_never_revives(self):
        refresh = str(RefreshToken.for_user(self.admin_a))
        session = UserSession.objects.create(
            user=self.admin_a,
            session_key="session-admin-a-18b",
            refresh_token_hash=hash_token(refresh),
            last_activity_at=timezone.now(),
            expires_at=timezone.now() + timedelta(days=1),
            active=True,
        )
        session_b = UserSession.objects.create(
            user=self.admin_b,
            session_key="session-admin-b-18b",
            last_activity_at=timezone.now(),
            expires_at=timezone.now() + timedelta(days=1),
            active=True,
        )

        self.auth(self.superadmin)
        suspended = self.client.post(
            f"/api/clinics/{self.clinic_a.id}/deactivate/",
            {"reason": "Suspensión controlada de certificación"},
            format="json",
        )
        self.assertEqual(suspended.status_code, status.HTTP_200_OK)
        session.refresh_from_db()
        session_b.refresh_from_db()
        self.assertFalse(session.active)
        self.assertTrue(session_b.active)
        self.clinic_b.refresh_from_db()
        self.assertTrue(self.clinic_b.activo)

        self.client.force_authenticate(user=None)
        blocked = self.client.post(
            "/api/auth/refresh/",
            {"refresh": refresh},
            format="json",
            HTTP_X_SESSION_KEY=session.session_key,
        )
        self.assertEqual(blocked.status_code, status.HTTP_401_UNAUTHORIZED)

        self.auth(self.superadmin)
        reactivated = self.client.post(
            f"/api/clinics/{self.clinic_a.id}/activate/",
            {"reason": "Reactivación autorizada después de validar"},
            format="json",
        )
        self.assertEqual(reactivated.status_code, status.HTTP_200_OK)
        self.client.force_authenticate(user=None)
        still_blocked = self.client.post(
            "/api/auth/refresh/",
            {"refresh": refresh},
            format="json",
            HTTP_X_SESSION_KEY=session.session_key,
        )
        self.assertEqual(still_blocked.status_code, status.HTTP_401_UNAUTHORIZED)
        fresh_login = self.client.post("/api/auth/login/", {"email": self.admin_a.email, "password": self.password}, format="json")
        self.assertEqual(fresh_login.status_code, status.HTTP_200_OK)

    def test_subscription_changes_require_reason_preserve_users_and_are_audited(self):
        smaller = SubscriptionPlan.objects.create(
            name="Reducido 18B",
            code="reducido-18b",
            max_users=1,
            max_doctors=1,
            max_patients=1,
        )
        initial_users = User.objects.filter(clinica=self.clinic_a).count()
        self.auth(self.superadmin)
        without_reason = self.client.patch(
            f"/api/subscriptions/clinics/{self.clinic_a.id}/change-plan/",
            {"plan": smaller.id, "billing_cycle": "monthly"},
            format="json",
        )
        self.assertEqual(without_reason.status_code, status.HTTP_400_BAD_REQUEST)
        changed = self.client.patch(
            f"/api/subscriptions/clinics/{self.clinic_a.id}/change-plan/",
            {"plan": smaller.id, "billing_cycle": "monthly", "reason": "Ajuste contractual controlado"},
            format="json",
        )
        self.assertEqual(changed.status_code, status.HTTP_200_OK, changed.data)
        self.assertEqual(User.objects.filter(clinica=self.clinic_a).count(), initial_users)
        self.assertTrue(
            AuditLog.objects.filter(
                module=AuditLog.Module.SUBSCRIPTIONS,
                object_id=str(self.clinic_a.subscription.id),
            ).exists()
        )
        usage = self.client.get(f"/api/subscriptions/clinics/{self.clinic_a.id}/usage/")
        self.assertEqual(usage.status_code, status.HTTP_200_OK)
        self.assertGreater(usage.data["users_count"], usage.data["max_users"])

        extended = self.client.patch(
            f"/api/subscriptions/clinics/{self.clinic_a.id}/extend-trial/",
            {"days": 14, "reason": "Extensión comercial autorizada"},
            format="json",
        )
        self.assertEqual(extended.status_code, status.HTTP_200_OK, extended.data)
        self.assertEqual(extended.data["status"], ClinicSubscription.Status.TRIAL)

        renewal_date = timezone.localdate() + timedelta(days=180)
        renewed = self.client.patch(
            f"/api/subscriptions/clinics/{self.clinic_a.id}/renew/",
            {"end_date": renewal_date.isoformat(), "reason": "Renovación contractual confirmada"},
            format="json",
        )
        self.assertEqual(renewed.status_code, status.HTTP_200_OK, renewed.data)
        self.assertEqual(renewed.data["status"], ClinicSubscription.Status.ACTIVE)

        cancelled = self.client.patch(
            f"/api/subscriptions/clinics/{self.clinic_a.id}/cancel/",
            {"reason": "Cancelación solicitada por la clínica"},
            format="json",
        )
        self.assertEqual(cancelled.status_code, status.HTTP_200_OK, cancelled.data)
        self.assertEqual(cancelled.data["status"], ClinicSubscription.Status.CANCELLED)
        self.assertEqual(User.objects.filter(clinica=self.clinic_a).count(), initial_users)

        reactivated = self.client.patch(
            f"/api/subscriptions/clinics/{self.clinic_a.id}/reactivate/",
            {"reason": "Reactivación contractual autorizada"},
            format="json",
        )
        self.assertEqual(reactivated.status_code, status.HTTP_200_OK, reactivated.data)
        self.assertEqual(reactivated.data["status"], ClinicSubscription.Status.ACTIVE)

    def test_superadmin_is_blocked_from_operational_clinical_data(self):
        self.auth(self.superadmin)
        expectations = {
            "/api/patients/": {status.HTTP_403_FORBIDDEN},
            "/api/medical-records/": {status.HTTP_403_FORBIDDEN},
            "/api/consultations/": {status.HTTP_200_OK, status.HTTP_403_FORBIDDEN},
            "/api/prescriptions/": {status.HTTP_200_OK, status.HTTP_403_FORBIDDEN},
            "/api/hospitalization/medications/pending/": {status.HTTP_403_FORBIDDEN},
            "/api/documents/": {status.HTTP_200_OK, status.HTTP_403_FORBIDDEN},
            "/api/inventory/items/": {status.HTTP_200_OK, status.HTTP_403_FORBIDDEN},
            "/api/purchases/orders/": {status.HTTP_403_FORBIDDEN},
            "/api/billing/invoices/": {status.HTTP_200_OK, status.HTTP_403_FORBIDDEN},
        }
        for endpoint, allowed_statuses in expectations.items():
            response = self.client.get(endpoint)
            self.assertIn(response.status_code, allowed_statuses, endpoint)
            if response.status_code == status.HTTP_200_OK:
                self.assertIn(response.data, [[], {"count": 0, "results": []}], endpoint)
        self.assertTrue(
            AuditLog.objects.filter(
                user=self.superadmin,
                action=AuditLog.Action.PERMISSION_DENIED,
                request_path__in=["/api/patients/", "/api/medical-records/"],
            ).exists()
        )

    def test_audit_log_is_append_only(self):
        log = AuditLog.objects.create(action=AuditLog.Action.VIEW, module=AuditLog.Module.SYSTEM, description="Certificación")
        log.description = "Intento de cambio"
        with self.assertRaises(DjangoValidationError):
            log.save()
        with self.assertRaises(DjangoValidationError):
            log.delete()
