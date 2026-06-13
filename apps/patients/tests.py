from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.clinics.models import Clinic
from apps.patients.models import Patient


class PatientsModuleTests(APITestCase):
    def setUp(self):
        self.superadmin_role = Role.objects.create(nombre="superadmin")
        self.admin_role = Role.objects.create(nombre="admin")
        self.medico_role = Role.objects.create(nombre="medico")
        self.recepcion_role = Role.objects.create(nombre="recepcionista")
        self.paciente_role = Role.objects.create(nombre="paciente")
        self.clinic = Clinic.objects.create(nombre="Clinica Demo")
        self.other_clinic = Clinic.objects.create(nombre="Clinica Norte")
        self.superadmin = User.objects.create_user(email="super@x.com", password="x", nombre_completo="Super", role=self.superadmin_role, is_superuser=True)
        self.admin = User.objects.create_user(email="admin@x.com", password="x", nombre_completo="Admin", role=self.admin_role, clinica=self.clinic)
        self.medico = User.objects.create_user(email="medico@x.com", password="x", nombre_completo="Medico", role=self.medico_role, clinica=self.clinic)
        self.recepcion = User.objects.create_user(email="recepcion@x.com", password="x", nombre_completo="Recepcion", role=self.recepcion_role, clinica=self.clinic)
        self.patient_user = User.objects.create_user(email="paciente@x.com", password="x", nombre_completo="Paciente", role=self.paciente_role, clinica=self.clinic)
        self.patient = Patient.objects.create(clinic=self.clinic, user=self.patient_user, nombres="Juan", apellidos="Perez", identidad="080119900001")
        Patient.objects.create(clinic=self.other_clinic, nombres="Maria", apellidos="Lopez", identidad="080219900002")

    def auth(self, user):
        self.client.force_authenticate(user=user)

    def payload(self):
        return {"nombres": "Ana", "apellidos": "Soto", "identidad": "080319900003", "genero": "femenino", "tipo_sangre": "A+", "telefono": "9999-9999"}

    def test_superadmin_puede_listar_todas_las_clinicas(self):
        self.auth(self.superadmin)
        response = self.client.get("/api/patients/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_admin_solo_lista_su_clinica(self):
        self.auth(self.admin)
        response = self.client.get("/api/patients/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual({item["clinic"] for item in response.data}, {self.clinic.id})

    def test_admin_no_crea_paciente_en_otra_clinica(self):
        self.auth(self.admin)
        response = self.client.post("/api/patients/", {**self.payload(), "clinic": self.other_clinic.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Patient.objects.get(identidad="080319900003").clinic_id, self.clinic.id)

    def test_recepcionista_puede_crear_paciente(self):
        self.auth(self.recepcion)
        response = self.client.post("/api/patients/", self.payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_medico_puede_ver_pacientes_de_su_clinica(self):
        self.auth(self.medico)
        response = self.client.get("/api/patients/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_paciente_solo_ve_su_perfil(self):
        self.auth(self.patient_user)
        response = self.client.get("/api/patients/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.patient.id)

    def test_paciente_no_lista_pacientes(self):
        self.auth(self.patient_user)
        response = self.client.get("/api/patients/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_identidad_no_se_repite_en_misma_clinica(self):
        self.auth(self.admin)
        response = self.client.post("/api/patients/", {**self.payload(), "identidad": "080119900001"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_codigo_se_genera_automaticamente(self):
        patient = Patient.objects.create(clinic=self.clinic, nombres="Auto", apellidos="Codigo")
        self.assertTrue(patient.codigo_paciente.startswith("PAC-"))

    def test_delete_desactiva_y_no_borra(self):
        self.auth(self.admin)
        response = self.client.delete(f"/api/patients/{self.patient.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.patient.refresh_from_db()
        self.assertFalse(self.patient.activo)

    def test_activate_deactivate_funciona_con_permisos(self):
        self.auth(self.admin)
        response = self.client.patch(f"/api/patients/{self.patient.id}/deactivate/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response = self.client.patch(f"/api/patients/{self.patient.id}/activate/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_sin_autenticacion_no_accede(self):
        response = self.client.get("/api/patients/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
