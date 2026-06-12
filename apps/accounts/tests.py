from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.clinics.models import Clinic


class AuthAndUsersTests(APITestCase):
    def setUp(self):
        self.superadmin_role = Role.objects.create(nombre="superadmin")
        self.admin_role = Role.objects.create(nombre="admin")
        self.medico_role = Role.objects.create(nombre="medico")
        self.paciente_role = Role.objects.create(nombre="paciente")
        self.clinic = Clinic.objects.create(nombre="Clinica Demo", correo="demo@medicore.com")
        self.other_clinic = Clinic.objects.create(nombre="Clinica Norte", correo="norte@medicore.com")
        self.superadmin = User.objects.create_user(
            email="admin@medicore.com",
            password="Admin12345*",
            nombre_completo="Super Administrador",
            role=self.superadmin_role,
            is_staff=True,
            is_superuser=True,
        )
        self.clinic_admin = User.objects.create_user(
            email="clinic-admin@medicore.com",
            password="Admin12345*",
            nombre_completo="Admin Clinica",
            role=self.admin_role,
            clinica=self.clinic,
        )
        self.normal_user = User.objects.create_user(
            email="medico@medicore.com",
            password="Medico12345*",
            nombre_completo="Dra. Demo",
            role=self.medico_role,
            clinica=self.clinic,
        )
        User.objects.create_user(
            email="externo@medicore.com",
            password="Medico12345*",
            nombre_completo="Dr. Externo",
            role=self.medico_role,
            clinica=self.other_clinic,
        )

    def authenticate(self, user=None):
        self.client.force_authenticate(user=user or self.superadmin)

    def test_login_correcto(self):
        response = self.client.post(
            "/api/auth/login/",
            {"email": "admin@medicore.com", "password": "Admin12345*"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertEqual(response.data["user"]["email"], "admin@medicore.com")

    def test_login_incorrecto(self):
        response = self.client.post(
            "/api/auth/login/",
            {"email": "admin@medicore.com", "password": "wrong"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_superadmin_puede_ver_dashboard_global(self):
        self.authenticate(self.superadmin)
        response = self.client.get("/api/admin/dashboard/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_clinics"], 2)
        self.assertEqual(response.data["total_users"], 4)
        self.assertEqual(response.data["total_admins"], 1)

    def test_admin_no_puede_ver_dashboard_global(self):
        self.authenticate(self.clinic_admin)
        response = self.client.get("/api/admin/dashboard/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_superadmin_puede_ver_todas_las_clinicas(self):
        self.authenticate(self.superadmin)
        response = self.client.get("/api/clinics/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_admin_solo_ve_su_clinica(self):
        self.authenticate(self.clinic_admin)
        response = self.client.get("/api/clinics/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.clinic.id)

    def test_superadmin_puede_crear_admin_de_clinica(self):
        self.authenticate(self.superadmin)
        response = self.client.post(
            "/api/users/",
            {
                "email": "nuevo-admin@medicore.com",
                "password": "Admin12345*",
                "nombre_completo": "Nuevo Admin",
                "role": self.admin_role.id,
                "clinica": self.clinic.id,
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = User.objects.get(email="nuevo-admin@medicore.com")
        self.assertEqual(created.role.nombre, "admin")
        self.assertEqual(created.clinica_id, self.clinic.id)

    def test_admin_no_puede_crear_superadmin(self):
        self.authenticate(self.clinic_admin)
        response = self.client.post(
            "/api/users/",
            {
                "email": "otro-super@medicore.com",
                "password": "Admin12345*",
                "nombre_completo": "Otro Super",
                "role": self.superadmin_role.id,
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_usuario_normal_no_puede_listar_usuarios(self):
        self.authenticate(self.normal_user)
        response = self.client.get("/api/users/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_solo_ve_usuarios_de_su_clinica(self):
        self.authenticate(self.clinic_admin)
        response = self.client.get("/api/users/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        clinic_ids = {item["clinica"] for item in response.data}
        self.assertEqual(clinic_ids, {self.clinic.id})

    def test_no_se_puede_desactivar_ultimo_superadmin_activo(self):
        self.authenticate(self.superadmin)
        response = self.client.patch(f"/api/users/{self.superadmin.id}/deactivate/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.superadmin.refresh_from_db()
        self.assertTrue(self.superadmin.is_active)

    def test_admin_puede_ver_dashboard_de_su_clinica(self):
        self.authenticate(self.clinic_admin)
        response = self.client.get("/api/clinic-admin/dashboard/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["clinic"]["id"], self.clinic.id)
        self.assertEqual(response.data["total_users"], 2)

    def test_admin_no_puede_ver_dashboard_de_otra_clinica(self):
        self.authenticate(self.clinic_admin)
        response = self.client.get(f"/api/clinic-admin/dashboard/?clinic_id={self.other_clinic.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["clinic"]["id"], self.clinic.id)

    def test_admin_puede_ver_su_clinica(self):
        self.authenticate(self.clinic_admin)
        response = self.client.get("/api/clinic-admin/my-clinic/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.clinic.id)

    def test_admin_puede_editar_datos_basicos_de_su_clinica(self):
        self.authenticate(self.clinic_admin)
        response = self.client.patch(
            "/api/clinic-admin/my-clinic/",
            {"telefono": "2222-3333", "activo": False},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.clinic.refresh_from_db()
        self.assertEqual(self.clinic.telefono, "2222-3333")
        self.assertTrue(self.clinic.activo)

    def test_admin_puede_listar_usuarios_de_su_clinica(self):
        self.authenticate(self.clinic_admin)
        response = self.client.get("/api/clinic-admin/users/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual({item["clinica"] for item in response.data}, {self.clinic.id})

    def test_admin_no_puede_listar_usuarios_de_otra_clinica(self):
        self.authenticate(self.clinic_admin)
        response = self.client.get(f"/api/clinic-admin/users/?clinic_id={self.other_clinic.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual({item["clinica"] for item in response.data}, {self.clinic.id})

    def test_admin_puede_crear_medico_en_su_clinica(self):
        self.authenticate(self.clinic_admin)
        response = self.client.post(
            "/api/clinic-admin/users/",
            {
                "email": "nuevo-medico@medicore.com",
                "password": "Medico12345*",
                "nombre_completo": "Nuevo Medico",
                "telefono": "9999-0000",
                "role": "medico",
                "clinic_id": self.other_clinic.id,
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = User.objects.get(email="nuevo-medico@medicore.com")
        self.assertEqual(created.clinica_id, self.clinic.id)

    def test_admin_no_puede_crear_superadmin_en_panel_clinica(self):
        self.authenticate(self.clinic_admin)
        response = self.client.post(
            "/api/clinic-admin/users/",
            {
                "email": "bad-super@medicore.com",
                "password": "Admin12345*",
                "nombre_completo": "Bad Super",
                "role": "superadmin",
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_medico_no_puede_acceder_panel_admin_clinica(self):
        self.authenticate(self.normal_user)
        response = self.client.get("/api/clinic-admin/dashboard/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_recepcionista_no_puede_acceder_panel_admin_clinica(self):
        recepcionista_role = Role.objects.create(nombre="recepcionista")
        recepcionista = User.objects.create_user(
            email="recepcion@medicore.com",
            password="Recepcion12345*",
            nombre_completo="Recepcionista",
            role=recepcionista_role,
            clinica=self.clinic,
        )
        self.authenticate(recepcionista)
        response = self.client.get("/api/clinic-admin/dashboard/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_no_se_puede_desactivar_ultimo_admin_activo_de_clinica(self):
        self.authenticate(self.clinic_admin)
        response = self.client.patch(f"/api/clinic-admin/users/{self.clinic_admin.id}/deactivate/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.clinic_admin.refresh_from_db()
        self.assertTrue(self.clinic_admin.is_active)

    def test_obtener_perfil_me(self):
        self.authenticate(self.superadmin)
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "admin@medicore.com")

    def test_actualizar_perfil_me_solo_campos_permitidos(self):
        self.authenticate(self.superadmin)
        response = self.client.patch(
            "/api/auth/me/",
            {
                "nombre_completo": "Super Admin Editado",
                "telefono": "9999-1111",
                "avatar_url": "https://example.com/avatar.png",
                "email": "cambio@medicore.com",
                "is_superuser": False,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.superadmin.refresh_from_db()
        self.assertEqual(self.superadmin.nombre_completo, "Super Admin Editado")
        self.assertEqual(self.superadmin.telefono, "9999-1111")
        self.assertEqual(self.superadmin.email, "admin@medicore.com")
        self.assertTrue(self.superadmin.is_superuser)
