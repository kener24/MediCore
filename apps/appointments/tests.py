from datetime import date, time, timedelta

from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.appointments.models import Appointment
from apps.clinics.models import Clinic
from apps.doctors.models import DoctorProfile, DoctorSchedule, MedicalSpecialty
from apps.patients.models import Patient


class AppointmentsModuleTests(APITestCase):
    def setUp(self):
        self.super_role = Role.objects.create(nombre="superadmin")
        self.admin_role = Role.objects.create(nombre="admin")
        self.medico_role = Role.objects.create(nombre="medico")
        self.recepcion_role = Role.objects.create(nombre="recepcionista")
        self.paciente_role = Role.objects.create(nombre="paciente")
        self.clinic = Clinic.objects.create(nombre="Clinica Demo")
        self.other_clinic = Clinic.objects.create(nombre="Clinica Norte")
        self.specialty = MedicalSpecialty.objects.create(nombre="Medicina General")
        self.admin = User.objects.create_user(email="admin@x.com", password="x", nombre_completo="Admin", role=self.admin_role, clinica=self.clinic)
        self.recepcion = User.objects.create_user(email="rec@x.com", password="x", nombre_completo="Rec", role=self.recepcion_role, clinica=self.clinic)
        self.doctor_user = User.objects.create_user(email="doc@x.com", password="x", nombre_completo="Doc", role=self.medico_role, clinica=self.clinic)
        self.second_doctor_user = User.objects.create_user(email="doc3@x.com", password="x", nombre_completo="Doc3", role=self.medico_role, clinica=self.clinic)
        self.other_doctor_user = User.objects.create_user(email="doc2@x.com", password="x", nombre_completo="Doc2", role=self.medico_role, clinica=self.other_clinic)
        self.patient_user = User.objects.create_user(email="pat@x.com", password="x", nombre_completo="Pat", role=self.paciente_role, clinica=self.clinic)
        self.other_patient_user = User.objects.create_user(email="pat2@x.com", password="x", nombre_completo="Pat2", role=self.paciente_role, clinica=self.other_clinic)
        self.doctor = DoctorProfile.objects.create(clinic=self.clinic, user=self.doctor_user, specialty=self.specialty, numero_colegiacion="CMH-1", duracion_consulta_minutos=30)
        self.second_doctor = DoctorProfile.objects.create(clinic=self.clinic, user=self.second_doctor_user, specialty=self.specialty, numero_colegiacion="CMH-3", duracion_consulta_minutos=30)
        self.other_doctor = DoctorProfile.objects.create(clinic=self.other_clinic, user=self.other_doctor_user, specialty=self.specialty, numero_colegiacion="CMH-2", duracion_consulta_minutos=30)
        self.patient = Patient.objects.create(clinic=self.clinic, user=self.patient_user, nombres="Juan", apellidos="Perez")
        self.other_patient = Patient.objects.create(clinic=self.other_clinic, user=self.other_patient_user, nombres="Ana", apellidos="Lopez")
        self.next_monday = date.today() + timedelta(days=(0 - date.today().weekday()) % 7)
        if self.next_monday < date.today():
            self.next_monday += timedelta(days=7)
        DoctorSchedule.objects.create(doctor=self.doctor, dia_semana="lunes", hora_inicio=time(8, 0), hora_fin=time(12, 0))
        DoctorSchedule.objects.create(doctor=self.second_doctor, dia_semana="lunes", hora_inicio=time(8, 0), hora_fin=time(12, 0))
        DoctorSchedule.objects.create(doctor=self.other_doctor, dia_semana="lunes", hora_inicio=time(8, 0), hora_fin=time(12, 0))

    def auth(self, user):
        self.client.force_authenticate(user=user)

    def payload(self, **overrides):
        data = {
            "patient": self.patient.id,
            "doctor": self.doctor.id,
            "scheduled_date": self.next_monday.isoformat(),
            "start_time": "08:00",
            "end_time": "08:30",
            "reason": "Consulta",
        }
        data.update(overrides)
        return data

    def create_appointment(self, start="08:00", end="08:30", patient=None, doctor=None, status_value="pendiente"):
        return Appointment.objects.create(
            clinic=(doctor or self.doctor).clinic,
            patient=patient or self.patient,
            doctor=doctor or self.doctor,
            scheduled_date=self.next_monday,
            start_time=start,
            end_time=end,
            reason="Consulta",
            status=status_value,
        )

    def test_admin_puede_crear_cita_en_su_clinica(self):
        self.auth(self.admin)
        response = self.client.post("/api/appointments/", self.payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_admin_no_puede_crear_cita_con_paciente_de_otra_clinica(self):
        self.auth(self.admin)
        response = self.client.post("/api/appointments/", self.payload(patient=self.other_patient.id), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_no_puede_crear_cita_con_medico_de_otra_clinica(self):
        self.auth(self.admin)
        response = self.client.post("/api/appointments/", self.payload(doctor=self.other_doctor.id), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_recepcionista_puede_crear_cita(self):
        self.auth(self.recepcion)
        response = self.client.post("/api/appointments/", self.payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_medico_puede_ver_sus_citas(self):
        self.create_appointment()
        self.auth(self.doctor_user)
        response = self.client.get("/api/appointments/my-appointments/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_medico_no_ve_citas_de_otro_medico(self):
        self.create_appointment(doctor=self.other_doctor, patient=self.other_patient)
        self.auth(self.doctor_user)
        response = self.client.get("/api/appointments/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_paciente_puede_ver_sus_citas(self):
        self.create_appointment()
        self.auth(self.patient_user)
        response = self.client.get("/api/appointments/my-patient-appointments/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_paciente_no_ve_citas_de_otro_paciente(self):
        self.create_appointment(patient=self.patient)
        self.auth(self.other_patient_user)
        response = self.client.get("/api/appointments/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_no_permite_choque_para_medico(self):
        self.create_appointment()
        self.auth(self.admin)
        response = self.client.post("/api/appointments/", self.payload(start_time="08:15", end_time="08:45"), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_no_permite_choque_para_paciente(self):
        self.create_appointment(doctor=self.second_doctor, patient=self.patient, start="08:00", end="08:30")
        self.auth(self.admin)
        response = self.client.post("/api/appointments/", self.payload(start_time="08:15", end_time="08:45"), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_no_permite_fuera_del_horario(self):
        self.auth(self.admin)
        response = self.client.post("/api/appointments/", self.payload(start_time="13:00", end_time="13:30"), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_confirm_cancel_attended(self):
        appointment = self.create_appointment()
        self.auth(self.admin)
        self.assertEqual(self.client.patch(f"/api/appointments/{appointment.id}/confirm/").status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.patch(f"/api/appointments/{appointment.id}/mark-attended/").status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.patch(f"/api/appointments/{appointment.id}/cancel/").status_code, status.HTTP_400_BAD_REQUEST)

    def test_availability_devuelve_slots(self):
        self.create_appointment()
        self.auth(self.admin)
        response = self.client.get(f"/api/appointments/availability/?doctor={self.doctor.id}&date={self.next_monday.isoformat()}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["available_slots"])
        self.assertEqual(len(response.data["booked_slots"]), 1)

    def test_sin_autenticacion_no_accede(self):
        response = self.client.get("/api/appointments/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
