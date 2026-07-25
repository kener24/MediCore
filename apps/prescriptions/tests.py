from datetime import date, timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.audit.models import AuditLog
from apps.clinics.models import Clinic
from apps.doctors.models import DoctorProfile, MedicalSpecialty
from apps.medical_records.models import ClinicalConsultation, MedicalRecord
from apps.patients.models import Patient
from apps.prescriptions.models import Diagnosis, MedicalOrder, Prescription


class PrescriptionsModuleTests(APITestCase):
    def setUp(self):
        self.roles = {name: Role.objects.create(nombre=name) for name in ["superadmin", "admin", "medico", "enfermera", "recepcionista", "paciente"]}
        self.clinic = Clinic.objects.create(nombre="Clinica Demo")
        self.other_clinic = Clinic.objects.create(nombre="Clinica Norte")
        self.specialty = MedicalSpecialty.objects.create(nombre="Medicina General")
        self.doctor_user = User.objects.create_user(email="doc@x.com", password="x", nombre_completo="Doc", role=self.roles["medico"], clinica=self.clinic)
        self.superadmin = User.objects.create_user(email="super@x.com", password="x", nombre_completo="Super", role=self.roles["superadmin"], is_superuser=True, is_staff=True)
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

    def test_bloquea_medicamento_si_paciente_tiene_alergia(self):
        self.patient.alergias = "Alergia a ibuprofeno"
        self.patient.save(update_fields=["alergias"])
        prescription = Prescription.objects.create(consultation=self.consultation)
        self.auth(self.doctor_user)
        response = self.client.post(f"/api/prescriptions/{prescription.id}/items/", {"medication_name": "Ibuprofeno", "dosage": "400mg", "frequency": "cada 12 horas"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("ibuprofeno", response.data["allergy_warnings"])

    def test_emitir_receta_valida_alergias_actualizadas(self):
        prescription = Prescription.objects.create(consultation=self.consultation)
        prescription.items.create(medication_name="Acetaminofen", dosage="500mg", frequency="cada 8 horas")
        self.patient.alergias = "acetaminofen"
        self.patient.save(update_fields=["alergias"])
        self.auth(self.doctor_user)
        response = self.client.patch(f"/api/prescriptions/{prescription.id}/issue/")
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn("alergia", response.data["detail"].lower())

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

    def test_superadmin_no_accede_a_recetas_diagnosticos_ni_ordenes(self):
        diagnosis = Diagnosis.objects.create(consultation=self.consultation, name="Diagnostico privado")
        prescription = Prescription.objects.create(consultation=self.consultation)
        order = MedicalOrder.objects.create(consultation=self.consultation, title="Orden privada")
        self.auth(self.superadmin)
        for url in ["/api/diagnoses/", "/api/prescriptions/", "/api/medical-orders/"]:
            response = self.client.get(url)
            self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_403_FORBIDDEN])
            if response.status_code == status.HTTP_200_OK:
                self.assertEqual(len(response.data), 0)
        for url in [
            f"/api/diagnoses/{diagnosis.id}/",
            f"/api/prescriptions/{prescription.id}/",
            f"/api/medical-orders/{order.id}/",
        ]:
            self.assertEqual(self.client.get(url).status_code, status.HTTP_404_NOT_FOUND)

    def test_paciente_no_puede_anular_datos_clinicos(self):
        diagnosis = Diagnosis.objects.create(consultation=self.consultation, name="Gripe")
        prescription = Prescription.objects.create(consultation=self.consultation)
        prescription.items.create(medication_name="Acetaminofen", dosage="500mg", frequency="cada 8 horas")
        prescription.issue(user=self.doctor_user)
        order = MedicalOrder.objects.create(consultation=self.consultation, title="Hemograma")
        self.consultation.status = ClinicalConsultation.Status.FINALIZADA
        self.consultation.save(update_fields=["status"])
        self.auth(self.patient_user)
        self.assertEqual(self.client.delete(f"/api/diagnoses/{diagnosis.id}/").status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.patch(f"/api/prescriptions/{prescription.id}/void/").status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.patch(f"/api/medical-orders/{order.id}/cancel/").status_code, status.HTTP_403_FORBIDDEN)

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

    def test_creacion_movil_anidada_y_emision_idempotente(self):
        self.auth(self.doctor_user)
        response = self.client.post(
            "/api/prescriptions/",
            {
                "consultation": self.consultation.id,
                "medications": [{"medication_name": "Acetaminofen", "dosage": "500 mg", "frequency": "cada 8 horas", "duration": "3 dias", "quantity": "9"}],
                "general_instructions": "Tomar con agua",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        prescription_id = response.data["id"]
        issued = self.client.patch(f"/api/prescriptions/{prescription_id}/issue/", {}, format="json")
        self.assertEqual(issued.status_code, status.HTTP_200_OK)
        self.assertEqual(issued.data["status"], Prescription.Status.EMITIDA)
        self.assertEqual(self.client.patch(f"/api/prescriptions/{prescription_id}/issue/", {}, format="json").status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(AuditLog.objects.filter(module=AuditLog.Module.PRESCRIPTIONS, action=AuditLog.Action.ISSUE, object_id=str(prescription_id)).count(), 1)

    def test_alergia_requiere_confirmacion_y_justificacion(self):
        self.patient.alergias = "Ibuprofeno"
        self.patient.save(update_fields=["alergias"])
        prescription = Prescription.objects.create(consultation=self.consultation)
        prescription.items.create(medication_name="Ibuprofeno", dosage="400 mg", frequency="cada 12 horas")
        self.auth(self.doctor_user)
        blocked = self.client.patch(f"/api/prescriptions/{prescription.id}/issue/", {}, format="json")
        self.assertEqual(blocked.status_code, status.HTTP_409_CONFLICT)
        confirmed = self.client.patch(
            f"/api/prescriptions/{prescription.id}/issue/",
            {"confirm_allergies": True, "allergy_override_reason": "Beneficio clinico evaluado por el medico."},
            format="json",
        )
        self.assertEqual(confirmed.status_code, status.HTTP_200_OK)
        prescription.refresh_from_db()
        self.assertEqual(prescription.allergy_reviewed_by, self.doctor_user)

    def test_receta_emitida_pdf_cancelacion_y_portal_seguros(self):
        prescription = Prescription.objects.create(consultation=self.consultation)
        prescription.items.create(medication_name="Acetaminofen", dosage="500 mg", frequency="cada 8 horas")
        prescription.issue(user=self.doctor_user)
        self.auth(self.doctor_user)
        self.assertEqual(self.client.get(f"/api/prescriptions/{prescription.id}/pdf/").status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.delete(f"/api/prescriptions/{prescription.id}/").status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.auth(self.patient_user)
        portal_pdf = self.client.get(f"/api/patient-portal/prescriptions/{prescription.id}/pdf/")
        self.assertEqual(portal_pdf.status_code, status.HTTP_200_OK)
        self.auth(self.other_patient_user)
        self.assertEqual(self.client.get(f"/api/patient-portal/prescriptions/{prescription.id}/pdf/").status_code, status.HTTP_404_NOT_FOUND)
        self.auth(self.doctor_user)
        cancelled = self.client.patch(f"/api/prescriptions/{prescription.id}/void/", {"reason": "Correccion solicitada"}, format="json")
        self.assertEqual(cancelled.status_code, status.HTTP_200_OK)
        prescription.refresh_from_db()
        self.assertEqual(prescription.voided_by, self.doctor_user)

    def test_flujo_operativo_de_orden_medica(self):
        self.auth(self.doctor_user)
        created = self.client.post(
            "/api/medical-orders/",
            {"consultation": self.consultation.id, "description": "Hemograma completo", "order_type": "laboratorio", "priority": "prioritaria", "expires_at": (timezone.now() + timedelta(days=2)).isoformat()},
            format="json",
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        order_id = created.data["id"]
        self.auth(self.nurse)
        self.assertEqual(self.client.patch(f"/api/medical-orders/{order_id}/start/", {}, format="json").status_code, status.HTTP_200_OK)
        completed = self.client.patch(f"/api/medical-orders/{order_id}/complete/", {"result_summary": "Hemograma procesado y adjuntado."}, format="json")
        self.assertEqual(completed.status_code, status.HTTP_200_OK)
        self.auth(self.doctor_user)
        reviewed = self.client.patch(f"/api/medical-orders/{order_id}/review/", {"notes": "Resultado revisado."}, format="json")
        self.assertEqual(reviewed.status_code, status.HTTP_200_OK)
        self.assertEqual(reviewed.data["status"], MedicalOrder.Status.REVISADA)

    def test_cancelar_orden_requiere_motivo_y_no_borra(self):
        order = MedicalOrder.objects.create(consultation=self.consultation, title="Radiografia")
        self.auth(self.doctor_user)
        self.assertEqual(self.client.patch(f"/api/medical-orders/{order.id}/cancel/", {}, format="json").status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.client.patch(f"/api/medical-orders/{order.id}/cancel/", {"reason": "Orden duplicada"}, format="json").status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.delete(f"/api/medical-orders/{order.id}/").status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_orden_vencida_no_puede_iniciarse(self):
        order = MedicalOrder.objects.create(consultation=self.consultation, title="Orden vencida", expires_at=timezone.now() + timedelta(hours=1))
        MedicalOrder.objects.filter(pk=order.pk).update(expires_at=timezone.now() - timedelta(minutes=1))
        self.auth(self.doctor_user)
        detail = self.client.get(f"/api/medical-orders/{order.id}/")
        self.assertEqual(detail.data["status"], MedicalOrder.Status.VENCIDA)
        self.assertEqual(self.client.patch(f"/api/medical-orders/{order.id}/start/", {}, format="json").status_code, status.HTTP_409_CONFLICT)

    def test_medico_no_abre_receta_ni_orden_de_otra_clinica(self):
        other_prescription = Prescription.objects.create(consultation=self.other_consultation)
        other_order = MedicalOrder.objects.create(consultation=self.other_consultation, title="Orden ajena")
        self.auth(self.doctor_user)
        self.assertEqual(self.client.get(f"/api/prescriptions/{other_prescription.id}/").status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.get(f"/api/medical-orders/{other_order.id}/").status_code, status.HTTP_404_NOT_FOUND)

    def test_consulta_no_finaliza_con_receta_en_borrador(self):
        prescription = Prescription.objects.create(consultation=self.consultation)
        prescription.items.create(medication_name="Acetaminofen", dosage="500 mg", frequency="cada 8 horas")
        self.auth(self.doctor_user)
        blocked = self.client.post(f"/api/consultations/{self.consultation.id}/complete/", {}, format="json")
        self.assertEqual(blocked.status_code, status.HTTP_409_CONFLICT)
        self.assertIn("borrador", blocked.data["detail"].lower())
        self.assertEqual(self.client.patch(f"/api/prescriptions/{prescription.id}/issue/", {}, format="json").status_code, status.HTTP_200_OK)
        completed = self.client.post(
            f"/api/consultations/{self.consultation.id}/complete/",
            {
                "clinical_assessment": "Evaluacion clinica documentada.",
                "treatment_plan": "Continuar el tratamiento indicado y seguimiento.",
            },
            format="json",
        )
        self.assertEqual(completed.status_code, status.HTTP_200_OK)
