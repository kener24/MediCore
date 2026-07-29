from io import StringIO

from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.audit.models import AuditLog
from apps.clinics.models import Clinic
from apps.doctors.models import DoctorProfile, MedicalSpecialty
from apps.hospitalization.models import (
    HospitalBed,
    HospitalBedAssignment,
    HospitalRoom,
    HospitalVitalSigns,
    Hospitalization,
    MedicalEvolution,
    MedicalInstruction,
    NursingNote,
    TreatmentPlan,
)
from apps.patients.models import Patient


class HospitalizationSprint16ACertificationTests(APITestCase):
    def setUp(self):
        self.roles = {name: Role.objects.create(nombre=name) for name in ["superadmin", "admin", "medico", "enfermera", "recepcionista", "paciente"]}
        self.clinic_a = Clinic.objects.create(nombre="Clinica A", correo="a16@test.local")
        self.clinic_b = Clinic.objects.create(nombre="Clinica B", correo="b16@test.local")
        self.admin_a = self.user("admin-a16@test.local", "admin", self.clinic_a)
        self.admin_b = self.user("admin-b16@test.local", "admin", self.clinic_b)
        self.nurse_a = self.user("nurse-a16@test.local", "enfermera", self.clinic_a)
        self.nurse_b = self.user("nurse-b16@test.local", "enfermera", self.clinic_b)
        self.doctor_user_a = self.user("doctor-a16@test.local", "medico", self.clinic_a)
        self.doctor_user_b = self.user("doctor-b16@test.local", "medico", self.clinic_b)
        self.reception_a = self.user("reception-a16@test.local", "recepcionista", self.clinic_a)
        self.superadmin = self.user("super-a16@test.local", "superadmin", None, is_superuser=True)
        specialty = MedicalSpecialty.objects.create(nombre="Medicina interna")
        self.doctor_a = DoctorProfile.objects.create(clinic=self.clinic_a, user=self.doctor_user_a, specialty=specialty, numero_colegiacion="A-16")
        self.doctor_b = DoctorProfile.objects.create(clinic=self.clinic_b, user=self.doctor_user_b, specialty=specialty, numero_colegiacion="B-16")
        self.patient_a = Patient.objects.create(clinic=self.clinic_a, codigo_paciente="PA-16", nombres="Ana", apellidos="Alvarez", identidad="0801199011111", alergias="Penicilina", enfermedades_cronicas="Hipertension")
        self.patient_b = Patient.objects.create(clinic=self.clinic_b, codigo_paciente="PB-16", nombres="Berta", apellidos="Benitez")
        self.room_a = HospitalRoom.objects.create(clinic=self.clinic_a, name="General A", room_number="A-101")
        self.room_b = HospitalRoom.objects.create(clinic=self.clinic_b, name="General B", room_number="B-101")
        self.bed_a1 = HospitalBed.objects.create(clinic=self.clinic_a, room=self.room_a, bed_number="1")
        self.bed_a2 = HospitalBed.objects.create(clinic=self.clinic_a, room=self.room_a, bed_number="2")
        self.bed_b1 = HospitalBed.objects.create(clinic=self.clinic_b, room=self.room_b, bed_number="1")

    def user(self, email, role, clinic, is_superuser=False):
        return User.objects.create_user(email=email, password="Test12345*", nombre_completo=email.split("@")[0], role=self.roles[role], clinica=clinic, is_superuser=is_superuser, is_staff=is_superuser)

    def auth(self, user):
        self.client.force_authenticate(user)

    def create_admission(self, patient=None, user=None, bed=None, key=None):
        self.auth(user or self.admin_a)
        payload = {"patient": (patient or self.patient_a).id, "responsible_doctor": self.doctor_a.id, "reason": "Observacion hospitalaria", "status": "pending_admission"}
        if bed:
            payload["bed"] = bed.id
        headers = {"HTTP_IDEMPOTENCY_KEY": key} if key else {}
        return self.client.post("/api/hospitalization/admissions/", payload, format="json", **headers)

    def test_admission_is_idempotent_and_duplicate_is_conflict(self):
        first = self.create_admission(key="admission-16a")
        second = self.create_admission(key="admission-16a")
        duplicate = self.create_admission(key="admission-16b")
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 201)
        self.assertEqual(first.data["id"], second.data["id"])
        self.assertEqual(duplicate.status_code, 409)
        self.assertEqual(Hospitalization.objects.filter(patient=self.patient_a, status__in=Hospitalization.OPEN_STATUSES).count(), 1)

    def test_assign_transfer_and_cancel_preserve_bed_history(self):
        admission_id = self.create_admission().data["id"]
        assigned = self.client.post(f"/api/hospitalization/admissions/{admission_id}/assign-bed/", {"bed": self.bed_a1.id}, format="json")
        self.assertEqual(assigned.status_code, 200)
        self.assertEqual(assigned.data["status"], Hospitalization.Status.ACTIVE)
        without_reason = self.client.post(f"/api/hospitalization/admissions/{admission_id}/change-bed/", {"bed": self.bed_a2.id}, format="json")
        self.assertEqual(without_reason.status_code, 400)
        moved = self.client.post(f"/api/hospitalization/admissions/{admission_id}/change-bed/", {"bed": self.bed_a2.id, "notes": "Aislamiento preventivo"}, format="json")
        self.assertEqual(moved.status_code, 200)
        self.bed_a1.refresh_from_db(); self.bed_a2.refresh_from_db()
        self.assertEqual(self.bed_a1.status, HospitalBed.Status.CLEANING)
        self.assertEqual(self.bed_a2.status, HospitalBed.Status.OCCUPIED)
        self.assertEqual(HospitalBedAssignment.objects.filter(hospitalization_id=admission_id).count(), 2)
        cancelled = self.client.post(f"/api/hospitalization/admissions/{admission_id}/cancel/", {"reason": "Ingreso cancelado por criterio medico"}, format="json")
        self.assertEqual(cancelled.status_code, 200)
        self.bed_a2.refresh_from_db()
        self.assertEqual(self.bed_a2.status, HospitalBed.Status.AVAILABLE)
        self.assertFalse(HospitalBedAssignment.objects.filter(hospitalization_id=admission_id, released_at__isnull=True).exists())

    def test_same_bed_cannot_be_assigned_twice(self):
        first = self.create_admission(patient=self.patient_a).data["id"]
        other = Patient.objects.create(clinic=self.clinic_a, codigo_paciente="PA2-16", nombres="Carla", apellidos="Cruz")
        second = self.create_admission(patient=other).data["id"]
        self.assertEqual(self.client.post(f"/api/hospitalization/admissions/{first}/assign-bed/", {"bed": self.bed_a1.id}, format="json").status_code, 200)
        conflict = self.client.post(f"/api/hospitalization/admissions/{second}/assign-bed/", {"bed": self.bed_a1.id}, format="json")
        self.assertEqual(conflict.status_code, 409)
        self.assertEqual(HospitalBedAssignment.objects.filter(bed=self.bed_a1, released_at__isnull=True).count(), 1)

    def test_medical_evolution_sign_and_correction_are_audited_and_immutable(self):
        admission_id = self.create_admission(bed=self.bed_a1).data["id"]
        self.auth(self.doctor_user_a)
        created = self.client.post(f"/api/hospitalization/admissions/{admission_id}/evolutions/", {"subjective": "Refiere mejoria", "objective": "Paciente estable", "assessment": "Evolucion favorable", "plan": "Continuar vigilancia"}, format="json")
        self.assertEqual(created.status_code, 201)
        evolution_id = created.data["id"]
        signed = self.client.post(f"/api/hospitalization/evolutions/{evolution_id}/sign/", {}, format="json")
        self.assertEqual(signed.status_code, 200)
        evolution = MedicalEvolution.objects.get(pk=evolution_id)
        evolution.plan = "Cambio silencioso"
        with self.assertRaises(ValidationError):
            evolution.save()
        corrected = self.client.post(f"/api/hospitalization/evolutions/{evolution_id}/correct/", {"assessment": "Correccion de evaluacion", "plan": "Nuevo plan", "correction_reason": "Error de transcripcion"}, format="json")
        self.assertEqual(corrected.status_code, 201)
        self.assertEqual(corrected.data["correction_of"], evolution_id)
        self.assertTrue(AuditLog.objects.filter(module=AuditLog.Module.MEDICAL_RECORDS, object_id=str(evolution_id)).exists())

    def test_treatment_plan_replacement_keeps_versions(self):
        admission_id = self.create_admission(bed=self.bed_a1).data["id"]
        self.auth(self.doctor_user_a)
        first = self.client.post(f"/api/hospitalization/admissions/{admission_id}/treatment-plans/", {"goals": "Estabilizar", "treatment": "Hidratacion y vigilancia"}, format="json")
        self.assertEqual(first.status_code, 201)
        missing_reason = self.client.post(f"/api/hospitalization/admissions/{admission_id}/treatment-plans/", {"treatment": "Ajustar hidratacion"}, format="json")
        self.assertEqual(missing_reason.status_code, 400)
        second = self.client.post(f"/api/hospitalization/admissions/{admission_id}/treatment-plans/", {"treatment": "Ajustar hidratacion", "change_reason": "Respuesta clinica"}, format="json")
        self.assertEqual(second.status_code, 201)
        self.assertEqual(second.data["version"], 2)
        self.assertEqual(TreatmentPlan.objects.get(pk=first.data["id"]).status, TreatmentPlan.Status.REPLACED)
        self.assertEqual(TreatmentPlan.objects.filter(hospitalization_id=admission_id, status=TreatmentPlan.Status.ACTIVE).count(), 1)

    def test_instruction_acknowledgment_does_not_complete_it(self):
        admission_id = self.create_admission(bed=self.bed_a1).data["id"]
        self.auth(self.doctor_user_a)
        created = self.client.post(f"/api/hospitalization/admissions/{admission_id}/instructions/", {"instruction_type": "vital_signs", "priority": "urgent", "title": "Control de signos", "details": "Control cada cuatro horas"}, format="json")
        self.assertEqual(created.status_code, 201)
        self.auth(self.nurse_a)
        acknowledged = self.client.post(f"/api/hospitalization/instructions/{created.data['id']}/acknowledge/", {}, format="json")
        self.assertEqual(acknowledged.status_code, 200)
        self.assertEqual(acknowledged.data["status"], MedicalInstruction.Status.ACKNOWLEDGED)
        self.assertIsNone(acknowledged.data["completed_at"])
        completed = self.client.post(f"/api/hospitalization/instructions/{created.data['id']}/complete/", {}, format="json")
        self.assertEqual(completed.status_code, 200)
        self.assertEqual(completed.data["status"], MedicalInstruction.Status.COMPLETED)

    def test_nursing_note_round_vitals_event_and_timeline(self):
        admission_id = self.create_admission(bed=self.bed_a1).data["id"]
        self.auth(self.nurse_a)
        note = self.client.post(f"/api/hospitalization/admissions/{admission_id}/nursing-notes/", {"note_type": "important", "shift": "night", "title": "Turno noche", "note": "Paciente estable durante el turno"}, format="json")
        self.assertEqual(note.status_code, 201)
        note_model = NursingNote.objects.get(pk=note.data["id"])
        note_model.note = "Edicion silenciosa"
        with self.assertRaises(ValidationError):
            note_model.save()
        correction = self.client.post(f"/api/hospitalization/nursing-notes/{note.data['id']}/correct/", {"reason": "Dato incompleto", "note": "Paciente estable y tolera alimentacion"}, format="json")
        self.assertEqual(correction.status_code, 201)
        headers = {"HTTP_IDEMPOTENCY_KEY": "round-16a"}
        round_one = self.client.post(f"/api/hospitalization/admissions/{admission_id}/nursing-rounds/", {"round_type": "routine", "general_condition": "Estable"}, format="json", **headers)
        round_two = self.client.post(f"/api/hospitalization/admissions/{admission_id}/nursing-rounds/", {"round_type": "routine", "general_condition": "Estable"}, format="json", **headers)
        self.assertEqual(round_one.data["id"], round_two.data["id"])
        vitals = self.client.post(f"/api/hospitalization/admissions/{admission_id}/vital-signs/", {"temperature": "38.5", "heart_rate": 125, "oxygen_saturation": 90}, format="json")
        self.assertEqual(vitals.status_code, 201)
        self.assertTrue(vitals.data["is_abnormal"])
        event = self.client.post(f"/api/hospitalization/admissions/{admission_id}/events/", {"event_type": "deterioration", "severity": "critical", "description": "Se notifica deterioro al medico responsable"}, format="json")
        self.assertEqual(event.status_code, 201)
        timeline = self.client.get(f"/api/hospitalization/admissions/{admission_id}/timeline/")
        self.assertEqual(timeline.status_code, 200)
        self.assertGreaterEqual(timeline.data["count"], 4)
        self.assertTrue(HospitalVitalSigns.objects.filter(hospitalization_id=admission_id, is_abnormal=True).exists())

    def test_permissions_and_multitenancy_hide_clinical_data(self):
        admission_a = self.create_admission(bed=self.bed_a1).data["id"]
        self.auth(self.admin_b)
        self.assertEqual(self.client.get(f"/api/hospitalization/admissions/{admission_a}/").status_code, 404)
        self.assertEqual(self.client.post(f"/api/hospitalization/admissions/{admission_a}/assign-bed/", {"bed": self.bed_b1.id}, format="json").status_code, 404)
        self.auth(self.superadmin)
        self.assertEqual(self.client.get(f"/api/hospitalization/admissions/{admission_a}/").status_code, 404)
        self.auth(self.reception_a)
        reception_detail = self.client.get(f"/api/hospitalization/admissions/{admission_a}/")
        self.assertEqual(reception_detail.status_code, 200)
        self.assertNotIn("recent_nursing_notes", reception_detail.data)
        self.assertNotIn("patient_allergies", reception_detail.data)
        self.assertEqual(self.client.get(f"/api/hospitalization/admissions/{admission_a}/nursing-notes/").status_code, 403)
        self.auth(self.doctor_user_a)
        self.assertEqual(self.client.post(f"/api/hospitalization/admissions/{admission_a}/nursing-notes/", {"note": "No autorizado"}, format="json").status_code, 403)

    def test_cross_clinic_relations_and_invalid_timeline_limit_are_controlled(self):
        cross_patient = self.create_admission(patient=self.patient_b)
        self.assertEqual(cross_patient.status_code, 404)
        admission_id = self.create_admission().data["id"]
        cross_bed = self.client.post(f"/api/hospitalization/admissions/{admission_id}/assign-bed/", {"bed": self.bed_b1.id}, format="json")
        self.assertEqual(cross_bed.status_code, 404)
        self.auth(self.nurse_a)
        invalid_limit = self.client.get(f"/api/hospitalization/admissions/{admission_id}/timeline/?limit=no-es-numero")
        self.assertEqual(invalid_limit.status_code, 400)

    def test_consistency_command_reports_coherent_occupancy(self):
        admission_id = self.create_admission(bed=self.bed_a1).data["id"]
        output = StringIO()
        call_command("audit_hospital_bed_consistency", "--json", stdout=output)
        self.assertIn('"consistent": true', output.getvalue())
        self.assertEqual(Hospitalization.objects.get(pk=admission_id).current_bed_id, self.bed_a1.id)
