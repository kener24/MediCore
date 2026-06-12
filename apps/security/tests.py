from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.clinics.models import Clinic
from apps.security.models import AccountLock, PasswordResetToken, SecuritySetting, UserSession


class SecurityApiTests(APITestCase):
    def setUp(self):
        self.superadmin_role = Role.objects.create(nombre="superadmin")
        self.admin_role = Role.objects.create(nombre="admin")
        self.medico_role = Role.objects.create(nombre="medico")
        self.paciente_role = Role.objects.create(nombre="paciente")
        self.clinic = Clinic.objects.create(nombre="Clinica Centro", correo="centro@medicore.test")
        self.other_clinic = Clinic.objects.create(nombre="Clinica Norte", correo="norte@medicore.test")
        self.superadmin = User.objects.create_user(
            email="super@medicore.test",
            password="Admin12345*",
            nombre_completo="Super Admin",
            role=self.superadmin_role,
            is_staff=True,
            is_superuser=True,
        )
        self.admin = User.objects.create_user(
            email="admin@medicore.test",
            password="Admin12345*",
            nombre_completo="Admin Centro",
            role=self.admin_role,
            clinica=self.clinic,
        )
        self.other_admin = User.objects.create_user(
            email="admin-norte@medicore.test",
            password="Admin12345*",
            nombre_completo="Admin Norte",
            role=self.admin_role,
            clinica=self.other_clinic,
        )
        self.user = User.objects.create_user(
            email="medico@medicore.test",
            password="Medico12345*",
            nombre_completo="Medico Centro",
            role=self.medico_role,
            clinica=self.clinic,
        )
        SecuritySetting.objects.create(clinic=self.clinic, max_failed_login_attempts=2, lockout_minutes=30)

    def authenticate(self, user=None):
        self.client.force_authenticate(user=user or self.user)

    def test_password_reset_request_no_revela_si_email_existe(self):
        response = self.client.post("/api/security/password-reset/request/", {"email": "no-existe@medicore.test"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn("token", response.data)
        self.assertIn("Si el correo existe", response.data["detail"])

    @override_settings(DEBUG=True)
    def test_password_reset_confirm_cambia_contrasena_y_usa_token_una_vez(self):
        response = self.client.post("/api/security/password-reset/request/", {"email": self.user.email}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        token = response.data["token"]

        confirm = self.client.post(
            "/api/security/password-reset/confirm/",
            {"token": token, "new_password": "NuevaClave123!", "confirm_password": "NuevaClave123!"},
            format="json",
        )
        self.assertEqual(confirm.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NuevaClave123!"))
        self.assertIsNotNone(self.user.password_changed_at)
        self.assertIsNotNone(PasswordResetToken.objects.get(user=self.user).used_at)

        repeat = self.client.post(
            "/api/security/password-reset/confirm/",
            {"token": token, "new_password": "OtraClave123!", "confirm_password": "OtraClave123!"},
            format="json",
        )
        self.assertEqual(repeat.status_code, status.HTTP_400_BAD_REQUEST)

    @override_settings(DEBUG=True)
    def test_password_reset_rechaza_contrasena_debil(self):
        response = self.client.post("/api/security/password-reset/request/", {"email": self.user.email}, format="json")
        token = response.data["token"]
        confirm = self.client.post(
            "/api/security/password-reset/confirm/",
            {"token": token, "new_password": "abc", "confirm_password": "abc"},
            format="json",
        )
        self.assertEqual(confirm.status_code, status.HTTP_400_BAD_REQUEST)

    @override_settings(DEBUG=True)
    def test_email_verification_marca_usuario_verificado(self):
        self.authenticate(self.user)
        response = self.client.post("/api/security/email-verification/send/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(user=None)
        confirm = self.client.post("/api/security/email-verification/confirm/", {"token": response.data["token"]}, format="json")
        self.assertEqual(confirm.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.email_verified)

    def test_intentos_fallidos_bloquean_cuenta_y_login_correcto_falla(self):
        for _ in range(2):
            self.client.post("/api/auth/login/", {"email": self.user.email, "password": "bad-password"}, format="json")

        self.assertTrue(AccountLock.objects.filter(user=self.user, active=True).exists())
        response = self.client.post("/api/auth/login/", {"email": self.user.email, "password": "Medico12345*"}, format="json")
        self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED])

    def test_superadmin_desbloquea_cuenta(self):
        lock = AccountLock.objects.create(user=self.user, locked_until=timezone.now() + timezone.timedelta(days=1), reason="test", failed_attempts=2)
        self.authenticate(self.superadmin)
        response = self.client.patch(f"/api/security/account-locks/{lock.id}/unlock/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        lock.refresh_from_db()
        self.assertFalse(lock.active)

    def test_admin_no_desbloquea_usuario_de_otra_clinica(self):
        lock = AccountLock.objects.create(user=self.other_admin, locked_until=timezone.now() + timezone.timedelta(days=1), reason="test", failed_attempts=2)
        self.authenticate(self.admin)
        response = self.client.patch(f"/api/security/account-locks/{lock.id}/unlock/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_login_crea_sesion_y_usuario_solo_ve_sus_sesiones(self):
        response = self.client.post("/api/auth/login/", {"email": self.user.email, "password": "Medico12345*"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("session_key", response.data)
        self.authenticate(self.user)
        sessions = self.client.get("/api/security/sessions/", HTTP_X_SESSION_KEY=response.data["session_key"])
        self.assertEqual(sessions.status_code, status.HTTP_200_OK)
        self.assertEqual(len(sessions.data), 1)
        self.assertTrue(sessions.data[0]["current"])

    def test_usuario_revoca_sesion_propia_y_revoke_all_respeta_actual(self):
        current = UserSession.objects.create(
            user=self.user,
            session_key="actual",
            ip_address="127.0.0.1",
            user_agent="test",
            device_name="test",
            last_activity_at=timezone.now(),
            expires_at=timezone.now() + timezone.timedelta(days=1),
        )
        other = UserSession.objects.create(
            user=self.user,
            session_key="otra",
            ip_address="127.0.0.1",
            user_agent="test",
            device_name="test",
            last_activity_at=timezone.now(),
            expires_at=timezone.now() + timezone.timedelta(days=1),
        )
        self.authenticate(self.user)
        response = self.client.post("/api/security/sessions/revoke-all/", {"keep_current": True}, format="json", HTTP_X_SESSION_KEY="actual")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        current.refresh_from_db()
        other.refresh_from_db()
        self.assertTrue(current.active)
        self.assertFalse(other.active)

        revoke = self.client.patch(f"/api/security/sessions/{current.id}/revoke/")
        self.assertEqual(revoke.status_code, status.HTTP_200_OK)
        current.refresh_from_db()
        self.assertFalse(current.active)

    def test_endpoints_protegidos_requieren_jwt(self):
        response = self.client.get("/api/security/sessions/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
