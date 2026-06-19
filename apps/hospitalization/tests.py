from django.urls import reverse
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.audit.models import AuditLog
from apps.clinics.models import Clinic
from apps.hospitalization.models import HospitalBed, HospitalRoom, Hospitalization, MedicationAdministration
from apps.patients.models import Patient


class HospitalizationNursingFollowUpTests(APITestCase):
    def setUp(self):
        self.roles = {name: Role.objects.create(nombre=name) for name in ["superadmin", "admin", "medico", "enfermera", "recepcionista", "paciente"]}
        self.clinic = Clinic.objects.create(nombre="Clinica Demo", correo="demo-followup@medicore.com")
        self.other_clinic = Clinic.objects.create(nombre="Clinica Norte", correo="norte-followup@medicore.com")
        self.admin = User.objects.create_user(email="admin-follow@medicore.com", password="x", nombre_completo="Admin", role=self.roles["admin"], clinica=self.clinic)
        self.nurse = User.objects.create_user(email="nurse-follow@medicore.com", password="x", nombre_completo="Nurse", role=self.roles["enfermera"], clinica=self.clinic)
        self.doctor = User.objects.create_user(email="doctor-follow@medicore.com", password="x", nombre_completo="Doctor", role=self.roles["medico"], clinica=self.clinic)
        self.reception = User.objects.create_user(email="reception-follow@medicore.com", password="x", nombre_completo="Recepcion", role=self.roles["recepcionista"], clinica=self.clinic)
        self.superadmin = User.objects.create_user(email="super-follow@medicore.com", password="x", nombre_completo="Super", role=self.roles["superadmin"], is_superuser=True, is_staff=True)
        self.patient_user = User.objects.create_user(email="patient-follow@medicore.com", password="x", nombre_completo="Patient", role=self.roles["paciente"], clinica=self.clinic)
        self.patient = Patient.objects.create(clinic=self.clinic, user=self.patient_user, codigo_paciente="PAC-F1", nombres="Juan", apellidos="Perez")
        self.room = HospitalRoom.objects.create(clinic=self.clinic, name="Habitacion 1", room_number="H-1")
        self.bed = HospitalBed.objects.create(clinic=self.clinic, room=self.room, bed_number="1")
        self.second_bed = HospitalBed.objects.create(clinic=self.clinic, room=self.room, bed_number="2")
        self.hospitalization = Hospitalization.objects.create(clinic=self.clinic, patient=self.patient, admitted_by=self.admin, reason="Observacion post operatoria")

    def auth(self, user):
        self.client.force_authenticate(user=user)

    def test_enfermera_crea_y_ve_ronda(self):
        self.auth(self.nurse)
        url = f"/api/hospitalization/admissions/{self.hospitalization.id}/nursing-rounds/"
        response = self.client.post(url, {"round_type": "routine", "general_condition": "Estable", "pain_level": 2}, format="json")
        self.assertEqual(response.status_code, 201)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_no_crea_ronda_en_hospitalizacion_cerrada(self):
        self.hospitalization.status = Hospitalization.Status.DISCHARGED
        self.hospitalization.save()
        self.auth(self.nurse)
        response = self.client.post(f"/api/hospitalization/admissions/{self.hospitalization.id}/nursing-rounds/", {"round_type": "routine"}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_programa_y_administra_medicamento(self):
        self.auth(self.nurse)
        create_response = self.client.post(
            f"/api/hospitalization/admissions/{self.hospitalization.id}/medication-administrations/",
            {"medication_name": "Acetaminofen", "dosage": "500 mg", "route": "oral"},
            format="json",
        )
        self.assertEqual(create_response.status_code, 201)
        medication_id = create_response.data["id"]
        response = self.client.post(f"/api/hospitalization/medication-administrations/{medication_id}/administer/", {"notes": "Sin reaccion"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], MedicationAdministration.Status.ADMINISTERED)
        second = self.client.post(f"/api/hospitalization/medication-administrations/{medication_id}/administer/", {}, format="json")
        self.assertEqual(second.status_code, 400)

    def test_omitir_requiere_motivo(self):
        medication = MedicationAdministration.objects.create(hospitalization=self.hospitalization, medication_name="Ibuprofeno", dosage="400 mg")
        self.auth(self.nurse)
        response = self.client.post(f"/api/hospitalization/medication-administrations/{medication.id}/omit/", {}, format="json")
        self.assertEqual(response.status_code, 400)
        response = self.client.post(f"/api/hospitalization/medication-administrations/{medication.id}/omit/", {"reason": "Paciente en ayunas"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], MedicationAdministration.Status.OMITTED)

    def test_superadmin_no_accede_a_datos_clinicos(self):
        self.auth(self.superadmin)
        response = self.client.get("/api/hospitalization/medications/pending/")
        self.assertEqual(response.status_code, 403)

    def test_paciente_no_accede_a_rondas(self):
        self.auth(self.patient_user)
        response = self.client.get(f"/api/hospitalization/admissions/{self.hospitalization.id}/nursing-rounds/")
        self.assertEqual(response.status_code, 403)

    def test_no_permite_asignar_cama_ocupada_y_audita_asignacion(self):
        self.auth(self.admin)
        response = self.client.post(f"/api/hospitalization/admissions/{self.hospitalization.id}/assign-bed/", {"bed": self.bed.id}, format="json")
        self.assertEqual(response.status_code, 200)
        self.bed.refresh_from_db()
        self.assertEqual(self.bed.status, HospitalBed.Status.OCCUPIED)

        other_patient = Patient.objects.create(clinic=self.clinic, codigo_paciente="PAC-F2", nombres="Ana", apellidos="Lopez")
        other_hospitalization = Hospitalization.objects.create(clinic=self.clinic, patient=other_patient, admitted_by=self.admin, reason="Control")
        response = self.client.post(f"/api/hospitalization/admissions/{other_hospitalization.id}/assign-bed/", {"bed": self.bed.id}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertTrue(AuditLog.objects.filter(action=AuditLog.Action.UPDATE, module=AuditLog.Module.ADMISSIONS, object_id=str(self.hospitalization.id)).exists())

    def test_alta_libera_cama_y_bloquea_acciones_clinicas(self):
        self.auth(self.admin)
        self.client.post(f"/api/hospitalization/admissions/{self.hospitalization.id}/assign-bed/", {"bed": self.second_bed.id}, format="json")
        response = self.client.post(
            f"/api/hospitalization/admissions/{self.hospitalization.id}/discharge/",
            {"discharge_reason": "Mejoria clinica", "bed_status": "available"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.second_bed.refresh_from_db()
        self.assertEqual(self.second_bed.status, HospitalBed.Status.AVAILABLE)

        self.auth(self.nurse)
        response = self.client.post(f"/api/hospitalization/admissions/{self.hospitalization.id}/nursing-rounds/", {"round_type": "routine"}, format="json")
        self.assertEqual(response.status_code, 400)
        response = self.client.post(
            f"/api/hospitalization/admissions/{self.hospitalization.id}/medication-administrations/",
            {"medication_name": "Amoxicilina", "dosage": "500 mg"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_recepcion_no_ve_notas_clinicas_y_enfermeria_no_da_alta(self):
        self.auth(self.reception)
        response = self.client.get(f"/api/hospitalization/admissions/{self.hospitalization.id}/nursing-notes/")
        self.assertEqual(response.status_code, 403)

        self.auth(self.nurse)
        response = self.client.post(
            f"/api/hospitalization/admissions/{self.hospitalization.id}/discharge/",
            {"discharge_reason": "No autorizado"},
            format="json",
        )
        self.assertEqual(response.status_code, 403)
