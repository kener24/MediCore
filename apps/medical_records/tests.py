from datetime import date, time, timedelta

from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.appointments.models import Appointment
from apps.clinics.models import Clinic
from apps.doctors.models import DoctorProfile, DoctorSchedule, MedicalSpecialty
from apps.medical_records.models import ClinicalConsultation, MedicalRecord
from apps.patients.models import Patient


class MedicalRecordsModuleTests(APITestCase):
    def setUp(self):
        self.roles = {name: Role.objects.create(nombre=name) for name in ["superadmin", "admin", "medico", "enfermera", "recepcionista", "paciente"]}
        self.clinic = Clinic.objects.create(nombre="Clinica Demo")
        self.other_clinic = Clinic.objects.create(nombre="Clinica Norte")
        self.specialty = MedicalSpecialty.objects.create(nombre="Medicina General")
        self.admin = User.objects.create_user(email="admin@x.com", password="x", nombre_completo="Admin", role=self.roles["admin"], clinica=self.clinic)
        self.doctor_user = User.objects.create_user(email="doc@x.com", password="x", nombre_completo="Doc", role=self.roles["medico"], clinica=self.clinic)
        self.nurse = User.objects.create_user(email="nurse@x.com", password="x", nombre_completo="Nurse", role=self.roles["enfermera"], clinica=self.clinic)
        self.reception = User.objects.create_user(email="rec@x.com", password="x", nombre_completo="Rec", role=self.roles["recepcionista"], clinica=self.clinic)
        self.patient_user = User.objects.create_user(email="pat@x.com", password="x", nombre_completo="Pat", role=self.roles["paciente"], clinica=self.clinic)
        self.other_admin = User.objects.create_user(email="admin2@x.com", password="x", nombre_completo="Admin2", role=self.roles["admin"], clinica=self.other_clinic)
        self.doctor = DoctorProfile.objects.create(clinic=self.clinic, user=self.doctor_user, specialty=self.specialty, numero_colegiacion="CMH-1", duracion_consulta_minutos=30)
        self.patient = Patient.objects.create(clinic=self.clinic, user=self.patient_user, nombres="Juan", apellidos="Perez")
        self.other_patient = Patient.objects.create(clinic=self.other_clinic, nombres="Ana", apellidos="Lopez")
        self.next_monday = date.today() + timedelta(days=(0 - date.today().weekday()) % 7)
        DoctorSchedule.objects.create(doctor=self.doctor, dia_semana="lunes", hora_inicio=time(8, 0), hora_fin=time(12, 0))
        self.appointment = Appointment.objects.create(
            clinic=self.clinic,
            patient=self.patient,
            doctor=self.doctor,
            scheduled_date=self.next_monday,
            start_time=time(8, 0),
            end_time=time(8, 30),
            reason="Consulta",
        )

    def auth(self, user):
        self.client.force_authenticate(user=user)

    def test_crear_expediente(self):
        self.auth(self.admin)
        response = self.client.post("/api/medical-records/", {"patient": self.patient.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_no_crear_dos_expedientes(self):
        MedicalRecord.objects.create(patient=self.patient)
        self.auth(self.admin)
        response = self.client.post("/api/medical-records/", {"patient": self.patient.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_no_ve_otra_clinica(self):
        MedicalRecord.objects.create(patient=self.other_patient)
        self.auth(self.admin)
        response = self.client.get("/api/medical-records/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_medico_inicia_consulta_desde_cita(self):
        self.auth(self.doctor_user)
        response = self.client.post(f"/api/appointments/{self.appointment.id}/start-consultation/")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_no_iniciar_desde_cita_cancelada(self):
        self.appointment.status = Appointment.Status.CANCELADA
        self.appointment.save(update_fields=["status"])
        self.auth(self.doctor_user)
        response = self.client.post(f"/api/appointments/{self.appointment.id}/start-consultation/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_no_dos_consultas_misma_cita(self):
        record = MedicalRecord.objects.create(patient=self.patient)
        ClinicalConsultation.objects.create(clinic=self.clinic, medical_record=record, patient=self.patient, doctor=self.doctor, appointment=self.appointment, created_by=self.doctor_user)
        self.auth(self.doctor_user)
        response = self.client.post(f"/api/appointments/{self.appointment.id}/start-consultation/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_no_finalizar_sin_minimos(self):
        record = MedicalRecord.objects.create(patient=self.patient)
        consultation = ClinicalConsultation.objects.create(clinic=self.clinic, medical_record=record, patient=self.patient, doctor=self.doctor, created_by=self.doctor_user)
        self.auth(self.doctor_user)
        response = self.client.patch(f"/api/consultations/{consultation.id}/finalize/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_finalizar_marca_cita_atendida(self):
        record = MedicalRecord.objects.create(patient=self.patient)
        consultation = ClinicalConsultation.objects.create(clinic=self.clinic, medical_record=record, patient=self.patient, doctor=self.doctor, appointment=self.appointment, chief_complaint="Dolor", clinical_assessment="Estable", created_by=self.doctor_user)
        self.auth(self.doctor_user)
        response = self.client.patch(f"/api/consultations/{consultation.id}/finalize/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.appointment.refresh_from_db()
        self.assertEqual(self.appointment.status, Appointment.Status.ATENDIDA)

    def test_enfermera_registra_signos(self):
        record = MedicalRecord.objects.create(patient=self.patient)
        consultation = ClinicalConsultation.objects.create(clinic=self.clinic, medical_record=record, patient=self.patient, doctor=self.doctor, created_by=self.doctor_user)
        self.auth(self.nurse)
        response = self.client.post(f"/api/consultations/{consultation.id}/vital-signs/", {"weight": "70.00", "height": "1.70"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["bmi"], "24.22")

    def test_recepcionista_no_registra_signos(self):
        record = MedicalRecord.objects.create(patient=self.patient)
        consultation = ClinicalConsultation.objects.create(clinic=self.clinic, medical_record=record, patient=self.patient, doctor=self.doctor, created_by=self.doctor_user)
        self.auth(self.reception)
        response = self.client.post(f"/api/consultations/{consultation.id}/vital-signs/", {"weight": "70.00"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_sin_auth_no_accede(self):
        response = self.client.get("/api/medical-records/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
