from datetime import date

from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.clinics.models import Clinic
from apps.doctors.models import DoctorProfile, MedicalSpecialty
from apps.medical_records.models import ClinicalConsultation, MedicalRecord
from apps.patients.models import Patient
from apps.prescriptions.models import Diagnosis, Prescription


class PrescriptionsModuleTests(APITestCase):
    def setUp(self):
        self.roles = {name: Role.objects.create(nombre=name) for name in ["admin", "medico", "enfermera", "recepcionista", "paciente"]}
        self.clinic = Clinic.objects.create(nombre="Clinica Demo")
        self.other_clinic = Clinic.objects.create(nombre="Clinica Norte")
        self.specialty = MedicalSpecialty.objects.create(nombre="Medicina General")
        self.doctor_user = User.objects.create_user(email="doc@x.com", password="x", nombre_completo="Doc", role=self.roles["medico"], clinica=self.clinic)
        self.other_doctor_user = User.objects.create_user(email="doc2@x.com", password="x", nombre_completo="Doc2", role=self.roles["medico"], clinica=self.other_clinic)
        self.nurse = User.objects.create_user(email="nurse@x.com", password="x", nombre_completo="Nurse", role=self.roles["enfermera"], clinica=self.clinic)
        self.reception = User.objects.create_user(email="rec@x.com", password="x", nombre_completo="Rec", role=self.roles["recepcionista"], clinica=self.clinic)
        self.patient_user = User.objects.create_user(email="pat@x.com", password="x", nombre_completo="Pat", role=self.roles["paciente"], clinica=self.clinic)
        self.other_patient_user = User.objects.create_user(email="pat2@x.com", password="x", nombre_completo="Pat2", role=self.roles["paciente"], clinica=self.other_clinic)
        self.doctor = DoctorProfile.objects.create(clinic=self.clinic, user=self.doctor_user, specialty=self.specialty, numero_colegiacion="CMH-1")
        self.other_doctor = DoctorProfile.objects.create(clinic=self.other_clinic, user=self.other_doctor_user, specialty=self.specialty, numero_colegiacion="CMH-2")
        self.patient = Patient.objects.create(clinic=self.clinic, user=self.patient_user, nombres="Juan", apellidos="Perez")
        self.other_patient = Patient.objects.create(clinic=self.other_clinic, user=self.other_patient_user, nombres="Ana", apellidos="Lopez")
        self.record = MedicalRecord.objects.create(patient=self.patient)
        self.other_record = MedicalRecord.objects.create(patient=self.other_patient)
        self.consultation = ClinicalConsultation.objects.create(clinic=self.clinic, medical_record=self.record, patient=self.patient, doctor=self.doctor, consultation_date=date.today(), chief_complaint="Dolor", clinical_assessment="Estable", created_by=self.doctor_user)
        self.other_consultation = ClinicalConsultation.objects.create(clinic=self.other_clinic, medical_record=self.other_record, patient=self.other_patient, doctor=self.other_doctor, consultation_date=date.today(), created_by=self.other_doctor_user)

    def auth(self, user):
        self.client.force_authenticate(user=user)

    def test_medico_crea_diagnostico(self):
        self.auth(self.doctor_user)
        response = self.client.post("/api/diagnoses/", {"consultation": self.consultation.id, "name": "Gripe comun", "is_primary": True}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_medico_no_crea_diagnostico_otra_clinica(self):
        self.auth(self.doctor_user)
        response = self.client.post("/api/diagnoses/", {"consultation": self.other_consultation.id, "name": "Gripe comun"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_un_solo_diagnostico_principal(self):
        Diagnosis.objects.create(consultation=self.consultation, name="Gripe", is_primary=True)
        self.auth(self.doctor_user)
        response = self.client.post("/api/diagnoses/", {"consultation": self.consultation.id, "name": "Migraña", "is_primary": True}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_medico_crea_receta(self):
        self.auth(self.doctor_user)
        response = self.client.post("/api/prescriptions/", {"consultation": self.consultation.id, "general_instructions": "Tomar con agua"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_no_emitir_receta_sin_medicamentos(self):
        prescription = Prescription.objects.create(consultation=self.consultation)
        self.auth(self.doctor_user)
        response = self.client.patch(f"/api/prescriptions/{prescription.id}/issue/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_receta_emitida_no_se_edita(self):
        prescription = Prescription.objects.create(consultation=self.consultation)
        prescription.items.create(medication_name="Acetaminofen", dosage="500mg", frequency="cada 8 horas")
        prescription.issue()
        self.auth(self.doctor_user)
        response = self.client.patch(f"/api/prescriptions/{prescription.id}/", {"general_instructions": "Cambio"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_agrega_medicamento(self):
        prescription = Prescription.objects.create(consultation=self.consultation)
        self.auth(self.doctor_user)
        response = self.client.post(f"/api/prescriptions/{prescription.id}/items/", {"medication_name": "Ibuprofeno", "dosage": "400mg", "frequency": "cada 12 horas"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_no_medicamento_vacio(self):
        prescription = Prescription.objects.create(consultation=self.consultation)
        self.auth(self.doctor_user)
        response = self.client.post(f"/api/prescriptions/{prescription.id}/items/", {"medication_name": "", "dosage": "", "frequency": ""}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_crea_orden_medica(self):
        self.auth(self.doctor_user)
        response = self.client.post("/api/medical-orders/", {"consultation": self.consultation.id, "title": "Hemograma completo", "order_type": "laboratorio"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_paciente_ve_sus_recetas(self):
        prescription = Prescription.objects.create(consultation=self.consultation)
        prescription.items.create(medication_name="Acetaminofen", dosage="500mg", frequency="cada 8 horas")
        prescription.issue()
        self.auth(self.patient_user)
        response = self.client.get("/api/prescriptions/my-prescriptions/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_paciente_no_ve_recetas_de_otro(self):
        prescription = Prescription.objects.create(consultation=self.consultation)
        prescription.items.create(medication_name="Acetaminofen", dosage="500mg", frequency="cada 8 horas")
        prescription.issue()
        self.auth(self.other_patient_user)
        response = self.client.get("/api/prescriptions/my-prescriptions/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_recepcionista_no_crea_receta(self):
        self.auth(self.reception)
        response = self.client.post("/api/prescriptions/", {"consultation": self.consultation.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_enfermera_no_emite_receta(self):
        prescription = Prescription.objects.create(consultation=self.consultation)
        self.auth(self.nurse)
        response = self.client.patch(f"/api/prescriptions/{prescription.id}/issue/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_sin_auth_no_accede(self):
        response = self.client.get("/api/prescriptions/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_historial_incluye_datos_nuevos(self):
        Diagnosis.objects.create(consultation=self.consultation, name="Gripe")
        prescription = Prescription.objects.create(consultation=self.consultation)
        prescription.items.create(medication_name="Acetaminofen", dosage="500mg", frequency="cada 8 horas")
        self.auth(self.doctor_user)
        response = self.client.get(f"/api/patients/{self.patient.id}/clinical-history/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("diagnoses", response.data)
        self.assertIn("prescriptions", response.data)
        self.assertIn("medical_orders", response.data)
