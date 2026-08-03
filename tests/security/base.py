from rest_framework.test import APITestCase
from django.core.cache import cache

from apps.accounts.models import Role, User
from apps.clinics.models import Clinic


class SecurityTestCase(APITestCase):
    def setUp(self):
        cache.clear()
        self.roles = {
            name: Role.objects.create(nombre=name)
            for name in ["superadmin", "admin", "medico", "enfermera", "recepcionista", "cajero", "paciente"]
        }
        self.clinic_a = Clinic.objects.create(nombre="Clínica Seguridad A", correo="security-a@medicore.test")
        self.clinic_b = Clinic.objects.create(nombre="Clínica Seguridad B", correo="security-b@medicore.test")
        self.admin_a = self.create_user("admin-a@medicore.test", "admin", self.clinic_a)
        self.admin_b = self.create_user("admin-b@medicore.test", "admin", self.clinic_b)
        self.patient_user_a = self.create_user("patient-a@medicore.test", "paciente", self.clinic_a)
        self.patient_user_b = self.create_user("patient-b@medicore.test", "paciente", self.clinic_b)
        self.superadmin = self.create_user("superadmin@medicore.test", "superadmin", None, is_superuser=True)

    def create_user(self, email, role, clinic, password="ValidPassword123!", **extra):
        return User.objects.create_user(
            email=email,
            password=password,
            nombre_completo=email.split("@")[0],
            role=self.roles[role],
            clinica=clinic,
            is_staff=extra.get("is_superuser", False),
            is_superuser=extra.get("is_superuser", False),
        )

    def login(self, user, password="ValidPassword123!"):
        response = self.client.post("/api/auth/login/", {"email": user.email, "password": password}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        return response.data

    def use_session(self, login_data):
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {login_data['access']}",
            HTTP_X_SESSION_KEY=login_data["session_key"],
        )
