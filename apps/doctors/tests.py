from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.clinics.models import Clinic
from apps.doctors.models import DoctorProfile, MedicalSpecialty


class DoctorsModuleTests(APITestCase):
    def setUp(self):
        self.superadmin_role = Role.objects.create(nombre="superadmin")
        self.admin_role = Role.objects.create(nombre="admin")
        self.medico_role = Role.objects.create(nombre="medico")
        self.recepcion_role = Role.objects.create(nombre="recepcionista")
        self.clinic = Clinic.objects.create(nombre="Clinica Demo")
        self.other_clinic = Clinic.objects.create(nombre="Clinica Norte")
        self.specialty = MedicalSpecialty.objects.create(nombre="Medicina General")
        self.superadmin = User.objects.create_user(
            email="super@medicore.com",
            password="Admin12345*",
            nombre_completo="Super",
            role=self.superadmin_role,
            is_superuser=True,
            is_staff=True,
        )
        self.admin = User.objects.create_user(
            email="admin@clinic.com",
            password="Admin12345*",
            nombre_completo="Admin",
            role=self.admin_role,
            clinica=self.clinic,
        )
        self.doctor_user = User.objects.create_user(
            email="doctor@clinic.com",
            password="Doctor12345*",
            nombre_completo="Doctor Uno",
            role=self.medico_role,
            clinica=self.clinic,
        )
        self.other_doctor_user = User.objects.create_user(
            email="doctor@other.com",
            password="Doctor12345*",
            nombre_completo="Doctor Otro",
            role=self.medico_role,
            clinica=self.other_clinic,
        )
        self.recepcion = User.objects.create_user(
            email="recepcion@clinic.com",
            password="Recepcion12345*",
            nombre_completo="Recepcion",
            role=self.recepcion_role,
            clinica=self.clinic,
        )

    def auth(self, user):
        self.client.force_authenticate(user=user)

    def payload(self, user=None):
        return {
            "user": (user or self.doctor_user).id,
            "specialty": self.specialty.id,
            "numero_colegiacion": "CMH-12345",
            "titulo_profesional": "Doctor en Medicina General",
            "tarifa_consulta": "500.00",
            "duracion_consulta_minutos": 30,
            "atiende_presencial": True,
            "atiende_virtual": False,
            "activo": True,
        }

    def test_superadmin_puede_crear_especialidades(self):
        self.auth(self.superadmin)
        response = self.client.post("/api/specialties/", {"nombre": "Cardiologia", "activo": True}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_admin_puede_listar_especialidades(self):
        self.auth(self.admin)
        response = self.client.get("/api/specialties/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_no_puede_crear_especialidad(self):
        self.auth(self.admin)
        response = self.client.post("/api/specialties/", {"nombre": "Pediatria"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_puede_crear_perfil_medico_de_su_clinica(self):
        self.auth(self.admin)
        response = self.client.post("/api/doctors/", self.payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(DoctorProfile.objects.get().clinic_id, self.clinic.id)

    def test_admin_no_puede_crear_perfil_medico_de_otra_clinica(self):
        self.auth(self.admin)
        response = self.client.post("/api/doctors/", self.payload(self.other_doctor_user), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_no_puede_crear_perfil_para_usuario_no_medico(self):
        self.auth(self.admin)
        response = self.client.post("/api/doctors/", self.payload(self.admin), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_no_se_puede_crear_dos_perfiles_para_mismo_medico(self):
        DoctorProfile.objects.create(
            clinic=self.clinic,
            user=self.doctor_user,
            specialty=self.specialty,
            numero_colegiacion="CMH-12345",
        )
        self.auth(self.admin)
        response = self.client.post("/api/doctors/", {**self.payload(), "numero_colegiacion": "CMH-999"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_puede_crear_horario_valido(self):
        doctor = DoctorProfile.objects.create(
            clinic=self.clinic,
            user=self.doctor_user,
            specialty=self.specialty,
            numero_colegiacion="CMH-12345",
        )
        self.auth(self.admin)
        response = self.client.post(
            f"/api/doctors/{doctor.id}/schedules/",
            {"dia_semana": "lunes", "hora_inicio": "08:00", "hora_fin": "12:00", "activo": True},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_no_permite_hora_inicio_mayor_que_fin(self):
        doctor = DoctorProfile.objects.create(
            clinic=self.clinic,
            user=self.doctor_user,
            specialty=self.specialty,
            numero_colegiacion="CMH-12345",
        )
        self.auth(self.admin)
        response = self.client.post(
            f"/api/doctors/{doctor.id}/schedules/",
            {"dia_semana": "lunes", "hora_inicio": "14:00", "hora_fin": "12:00"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_no_permite_horario_cruzado(self):
        doctor = DoctorProfile.objects.create(
            clinic=self.clinic,
            user=self.doctor_user,
            specialty=self.specialty,
            numero_colegiacion="CMH-12345",
        )
        self.auth(self.admin)
        self.client.post(
            f"/api/doctors/{doctor.id}/schedules/",
            {"dia_semana": "lunes", "hora_inicio": "08:00", "hora_fin": "12:00"},
            format="json",
        )
        response = self.client.post(
            f"/api/doctors/{doctor.id}/schedules/",
            {"dia_semana": "lunes", "hora_inicio": "10:00", "hora_fin": "13:00"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_medico_puede_ver_su_propio_perfil(self):
        DoctorProfile.objects.create(
            clinic=self.clinic,
            user=self.doctor_user,
            specialty=self.specialty,
            numero_colegiacion="CMH-12345",
        )
        self.auth(self.doctor_user)
        response = self.client.get("/api/doctors/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_medico_no_puede_ver_perfil_de_otra_clinica(self):
        doctor = DoctorProfile.objects.create(
            clinic=self.other_clinic,
            user=self.other_doctor_user,
            specialty=self.specialty,
            numero_colegiacion="CMH-999",
        )
        self.auth(self.doctor_user)
        response = self.client.get(f"/api/doctors/{doctor.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_recepcionista_no_puede_administrar_medicos(self):
        self.auth(self.recepcion)
        response = self.client.post("/api/doctors/", self.payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

