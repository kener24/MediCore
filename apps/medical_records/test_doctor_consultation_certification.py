from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.admissions.models import PatientVisit
from apps.audit.models import AuditLog
from apps.clinic_settings.models import get_or_create_workflow_settings
from apps.clinics.models import Clinic
from apps.doctors.models import DoctorProfile, MedicalSpecialty
from apps.medical_records.models import ClinicalConsultation, MedicalRecord, VitalSigns
from apps.patients.models import Patient


class DoctorConsultationCertificationTests(APITestCase):
    def setUp(self):
        self.roles = {
            name: Role.objects.create(nombre=name)
            for name in ["admin", "medico", "enfermera", "recepcionista", "superadmin"]
        }
        self.clinic_a = Clinic.objects.create(nombre="Clinica A")
        self.clinic_b = Clinic.objects.create(nombre="Clinica B")
        self.specialty = MedicalSpecialty.objects.create(nombre="Medicina General")
        self.doctor_a_user = self.user("doctor-a@test.com", "medico", self.clinic_a)
        self.doctor_a = DoctorProfile.objects.create(
            clinic=self.clinic_a,
            user=self.doctor_a_user,
            specialty=self.specialty,
            numero_colegiacion="MED-A",
        )
        self.doctor_a2_user = self.user("doctor-a2@test.com", "medico", self.clinic_a)
        self.doctor_a2 = DoctorProfile.objects.create(
            clinic=self.clinic_a,
            user=self.doctor_a2_user,
            specialty=self.specialty,
            numero_colegiacion="MED-A2",
        )
        self.doctor_b_user = self.user("doctor-b@test.com", "medico", self.clinic_b)
        self.doctor_b = DoctorProfile.objects.create(
            clinic=self.clinic_b,
            user=self.doctor_b_user,
            specialty=self.specialty,
            numero_colegiacion="MED-B",
        )
        self.nurse = self.user("nurse@test.com", "enfermera", self.clinic_a)
        self.reception = self.user("reception@test.com", "recepcionista", self.clinic_a)
        self.superadmin = self.user("super@test.com", "superadmin", None, is_superuser=True)
        self.patient_a = Patient.objects.create(
            clinic=self.clinic_a,
            nombres="Paciente",
            apellidos="Uno",
            alergias="Penicilina",
            enfermedades_cronicas="Hipertension",
        )
        self.patient_b = Patient.objects.create(clinic=self.clinic_b, nombres="Paciente", apellidos="Dos")

    def user(self, email, role, clinic, **extra):
        return User.objects.create_user(
            email=email,
            password="Test12345*",
            nombre_completo=email.split("@")[0],
            role=self.roles[role],
            clinica=clinic,
            **extra,
        )

    def auth(self, user):
        self.client.force_authenticate(user=user)

    def visit(self, *, clinic=None, patient=None, doctor=None, triage=True):
        clinic = clinic or self.clinic_a
        patient = patient or self.patient_a
        doctor = doctor or self.doctor_a
        visit = PatientVisit.objects.create(
            clinic=clinic,
            patient=patient,
            assigned_doctor=doctor,
            reason="Dolor abdominal",
            symptoms="Paciente consciente y orientado",
            status=PatientVisit.Status.WAITING_DOCTOR,
        )
        if triage:
            visit.triage_completed_at = timezone.now()
            visit.save(update_fields=["triage_completed_at"])
        return visit

    def start(self, visit, user=None):
        self.auth(user or self.doctor_a_user)
        return self.client.patch(f"/api/admissions/visits/{visit.id}/start-consultation/")

    def complete_payload(self, version):
        return {
            "expected_version": version,
            "chief_complaint": "Dolor abdominal persistente",
            "clinical_assessment": "Paciente estable, sin signos de alarma",
            "preliminary_diagnosis": "Gastritis probable",
            "treatment_plan": "Tratamiento sintomatico y control en siete dias",
        }

    def test_start_is_idempotent_and_creates_one_consultation(self):
        visit = self.visit()
        first = self.start(visit)
        second = self.start(visit)
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertTrue(first.data["created"])
        self.assertFalse(second.data["created"])
        self.assertEqual(first.data["consultation_id"], second.data["consultation_id"])
        self.assertEqual(ClinicalConsultation.objects.filter(patient_visit=visit).count(), 1)
        self.assertEqual(
            AuditLog.objects.filter(module=AuditLog.Module.ADMISSIONS, description="Consulta iniciada desde visita.").count(),
            1,
        )

    def test_unique_constraint_prevents_two_consultations_for_visit(self):
        visit = self.visit()
        first = self.start(visit)
        consultation = ClinicalConsultation.objects.get(pk=first.data["consultation_id"])
        with self.assertRaises(IntegrityError), transaction.atomic():
            ClinicalConsultation.objects.bulk_create(
                [
                    ClinicalConsultation(
                        clinic=self.clinic_a,
                        medical_record=visit.medical_record,
                        patient=self.patient_a,
                        doctor=self.doctor_a,
                        patient_visit=visit,
                    )
                ]
            )
        self.assertTrue(ClinicalConsultation.objects.filter(pk=consultation.pk).exists())

    def test_start_requires_completed_triage_when_configured(self):
        response = self.start(self.visit(triage=False))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("triaje", response.data["detail"].lower())

    def test_wrong_doctor_and_other_clinic_are_blocked(self):
        visit_a = self.visit()
        self.assertEqual(self.start(visit_a, self.doctor_a2_user).status_code, status.HTTP_404_NOT_FOUND)
        visit_b = self.visit(clinic=self.clinic_b, patient=self.patient_b, doctor=self.doctor_b)
        self.assertEqual(self.start(visit_b, self.doctor_a_user).status_code, status.HTTP_404_NOT_FOUND)

    def test_save_draft_increments_version_and_detects_stale_client(self):
        started = self.start(self.visit())
        consultation_id = started.data["consultation_id"]
        saved = self.client.post(
            f"/api/consultations/{consultation_id}/save-draft/",
            {"expected_version": 1, "clinical_assessment": "Evaluacion inicial"},
            format="json",
        )
        self.assertEqual(saved.status_code, status.HTTP_200_OK)
        self.assertEqual(saved.data["version"], 2)
        stale = self.client.patch(
            f"/api/consultations/{consultation_id}/",
            {"expected_version": 1, "clinical_assessment": "Cambio obsoleto"},
            format="json",
        )
        self.assertEqual(stale.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(stale.data["code"], "consultation_version_conflict")
        self.assertEqual(stale.data["current_version"], 2)

    def test_clinical_context_is_scoped_and_contains_triage_history(self):
        visit = self.visit()
        VitalSigns.objects.create(
            patient_visit=visit,
            temperature="36.8",
            heart_rate=76,
            oxygen_saturation=98,
            registrado_por=self.nurse,
        )
        record = MedicalRecord.objects.get(patient=self.patient_a)
        record.current_medications = "Losartan"
        record.save(update_fields=["current_medications"])
        prior = ClinicalConsultation.objects.create(
            clinic=self.clinic_a,
            medical_record=record,
            patient=self.patient_a,
            doctor=self.doctor_a,
            chief_complaint="Control previo",
            clinical_assessment="Estable",
            preliminary_diagnosis="Hipertension controlada",
            treatment_plan="Continuar manejo",
            status=ClinicalConsultation.Status.FINALIZADA,
            finalized_at=timezone.now(),
            created_by=self.doctor_a_user,
        )
        started = self.start(visit)
        response = self.client.get(f"/api/consultations/{started.data['consultation_id']}/clinical-context/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["patient"]["id"], self.patient_a.id)
        self.assertEqual(response.data["allergies"], "Penicilina")
        self.assertEqual(response.data["chronic_medications"], "Losartan")
        self.assertEqual(response.data["current_triage"]["vital_signs"]["heart_rate"], 76)
        self.assertEqual(response.data["recent_consultations"][0]["id"], prior.id)

        self.auth(self.doctor_b_user)
        crossed = self.client.get(f"/api/consultations/{started.data['consultation_id']}/clinical-context/")
        self.assertEqual(crossed.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(
            AuditLog.objects.filter(
                user=self.doctor_b_user,
                action=AuditLog.Action.PERMISSION_DENIED,
                description="Intento de acceso a consulta fuera del alcance autorizado.",
            ).exists()
        )

    def test_finalize_is_idempotent_updates_visit_and_blocks_editing(self):
        visit = self.visit()
        started = self.start(visit)
        consultation_id = started.data["consultation_id"]
        first = self.client.patch(
            f"/api/consultations/{consultation_id}/finalize/",
            self.complete_payload(1),
            format="json",
        )
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(first.data["status"], ClinicalConsultation.Status.FINALIZADA)
        self.assertTrue(first.data["created"])
        visit.refresh_from_db()
        self.assertEqual(visit.status, PatientVisit.Status.WAITING_BILLING)
        self.assertIsNotNone(visit.consultation_completed_at)

        second = self.client.post(f"/api/consultations/{consultation_id}/complete/", {}, format="json")
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertFalse(second.data["created"])
        self.assertEqual(
            AuditLog.objects.filter(module=AuditLog.Module.CONSULTATIONS, action=AuditLog.Action.FINALIZE).count(),
            1,
        )
        edit = self.client.patch(
            f"/api/consultations/{consultation_id}/",
            {"expected_version": first.data["version"], "clinical_assessment": "Edicion posterior"},
            format="json",
        )
        self.assertEqual(edit.status_code, status.HTTP_409_CONFLICT)

    def test_finalize_requires_complaint_assessment_diagnosis_and_plan(self):
        started = self.start(self.visit())
        response = self.client.patch(
            f"/api/consultations/{started.data['consultation_id']}/finalize/",
            {"expected_version": 1},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("clinical_assessment", response.data)
        self.assertIn("treatment_plan", response.data)

    def test_finalize_uses_clinic_workflow_for_next_visit_status(self):
        workflow = get_or_create_workflow_settings(self.clinic_a)
        workflow.auto_send_to_billing_after_consultation = False
        workflow.save(update_fields=["auto_send_to_billing_after_consultation", "actualizado_en"])
        visit = self.visit()
        started = self.start(visit)
        response = self.client.post(
            f"/api/consultations/{started.data['consultation_id']}/complete/",
            self.complete_payload(1),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        visit.refresh_from_db()
        self.assertEqual(visit.status, PatientVisit.Status.CONSULTATION_FINISHED)
        self.assertIsNotNone(visit.consultation_completed_at)

    def test_non_doctor_roles_cannot_edit_or_complete(self):
        started = self.start(self.visit())
        consultation_id = started.data["consultation_id"]
        for user in [self.nurse, self.reception, self.superadmin]:
            self.auth(user)
            response = self.client.patch(
                f"/api/consultations/{consultation_id}/",
                {"clinical_assessment": "No autorizado"},
                format="json",
            )
            self.assertIn(response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])
