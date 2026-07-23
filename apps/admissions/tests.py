from datetime import time
from decimal import Decimal

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.admissions.models import PatientVisit
from apps.appointments.models import Appointment
from apps.audit.models import AuditLog
from apps.clinic_settings.models import get_or_create_workflow_settings
from apps.clinics.models import Clinic
from apps.doctors.models import DoctorProfile, DoctorSchedule, MedicalSpecialty
from apps.inventory.models import InventoryCategory, InventoryItem
from apps.medical_records.models import ClinicalConsultation, ClinicalSupplyUsage, MedicalRecord, VitalSigns
from apps.patients.models import Patient


def weekday_name(value):
    return ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"][value.weekday()]


class AdmissionsFlowTests(APITestCase):
    def setUp(self):
        self.roles = {name: Role.objects.create(nombre=name) for name in ["admin", "recepcionista", "enfermera", "medico", "paciente"]}
        self.clinic = Clinic.objects.create(nombre="Clinica Demo")
        self.other_clinic = Clinic.objects.create(nombre="Otra")
        self.admin = User.objects.create_user(email="admin@x.com", password="x", role=self.roles["admin"], clinica=self.clinic)
        self.rec = User.objects.create_user(email="rec@x.com", password="x", role=self.roles["recepcionista"], clinica=self.clinic)
        self.nurse = User.objects.create_user(email="nurse@x.com", password="x", role=self.roles["enfermera"], clinica=self.clinic)
        self.nurse_two = User.objects.create_user(email="nurse2@x.com", password="x", role=self.roles["enfermera"], clinica=self.clinic)
        self.other_nurse = User.objects.create_user(email="other-nurse@x.com", password="x", role=self.roles["enfermera"], clinica=self.other_clinic)
        self.doctor_user = User.objects.create_user(email="doc@x.com", password="x", role=self.roles["medico"], clinica=self.clinic)
        self.specialty = MedicalSpecialty.objects.create(nombre="General")
        self.doctor = DoctorProfile.objects.create(clinic=self.clinic, user=self.doctor_user, specialty=self.specialty, numero_colegiacion="MED-1")
        DoctorSchedule.objects.create(doctor=self.doctor, dia_semana=weekday_name(timezone.localdate()), hora_inicio=time(8, 0), hora_fin=time(17, 0))
        self.patient = Patient.objects.create(clinic=self.clinic, nombres="Juan", apellidos="Perez", identidad="080119900001")
        self.patient.alergias = "Penicilina"
        self.patient.enfermedades_cronicas = "Hipertension"
        self.patient.contacto_emergencia_nombre = "Contacto Seguro"
        self.patient.contacto_emergencia_telefono = "99999999"
        self.patient.save()
        self.other_patient = Patient.objects.create(clinic=self.other_clinic, nombres="Ana", apellidos="Lopez", identidad="080219900002")
        self.patient_two = Patient.objects.create(clinic=self.clinic, nombres="Maria", apellidos="Diaz", identidad="080319900004")
        self.category = InventoryCategory.objects.create(clinic=self.clinic, name="Medicamentos")
        self.item = InventoryItem.objects.create(clinic=self.clinic, category=self.category, name="Suero", sale_price=Decimal("200.00"), stock_current=Decimal("2.00"))

    def auth(self, user):
        self.client.force_authenticate(user=user)

    def register_visit(self):
        self.auth(self.rec)
        res = self.client.post("/api/admissions/register-walk-in/", {"patient": self.patient.id, "visit": {"reason": "Dolor", "symptoms": "Dolor abdominal", "assigned_doctor": self.doctor.id}}, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        return PatientVisit.objects.get(id=res.data["id"])

    def start_and_record_signs(self, visit, user=None, **overrides):
        self.auth(user or self.nurse)
        started = self.client.patch(f"/api/admissions/visits/{visit.id}/start-triage/")
        self.assertEqual(started.status_code, status.HTTP_200_OK)
        payload = {"weight": "80.00", "height": "1.80", "oxygen_saturation": 98, **overrides}
        signs = self.client.post(f"/api/admissions/visits/{visit.id}/vital-signs/", payload, format="json")
        self.assertIn(signs.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])
        return signs

    def test_recepcion_registra_paciente_nuevo_sin_cita_y_crea_expediente(self):
        self.auth(self.rec)
        res = self.client.post(
            "/api/admissions/register-walk-in/",
            {"patient": None, "patient_data": {"nombres": "Luis", "apellidos": "Mora", "identidad": "080319900003", "genero": "masculino"}, "visit": {"reason": "Fiebre", "symptoms": "2 dias"}},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        patient = Patient.objects.get(identidad="080319900003")
        self.assertTrue(MedicalRecord.objects.filter(patient=patient).exists())
        self.assertEqual(res.data["patient"], patient.id)

    def test_si_paciente_existe_no_duplica_por_identidad(self):
        self.auth(self.rec)
        res = self.client.post(
            "/api/admissions/register-walk-in/",
            {"patient": None, "patient_data": {"nombres": "Juan 2", "apellidos": "Perez", "identidad": "080119900001"}, "visit": {"reason": "Dolor"}},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Patient.objects.filter(clinic=self.clinic, identidad="080119900001").count(), 1)
        self.assertEqual(res.data["patient"], self.patient.id)

    def test_no_crea_dos_visitas_activas_mismo_dia(self):
        self.register_visit()
        self.auth(self.rec)
        res = self.client.post("/api/admissions/register-walk-in/", {"patient": self.patient.id, "visit": {"reason": "Otro"}}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_check_in_cita_crea_patient_visit(self):
        appt = Appointment.objects.create(clinic=self.clinic, patient=self.patient, doctor=self.doctor, scheduled_date=timezone.localdate(), start_time=time(9, 0), end_time=time(9, 30), reason="Control")
        self.auth(self.rec)
        res = self.client.patch(f"/api/appointments/{appt.id}/check-in/", {"symptoms": "Nausea"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["appointment_id"], appt.id)
        self.assertEqual(res.data["visit"]["appointment"], appt.id)

    def test_enfermera_triaje_signos_e_imc_y_oxigeno_invalido(self):
        visit = self.register_visit()
        self.auth(self.nurse)
        start = self.client.patch(f"/api/admissions/visits/{visit.id}/start-triage/")
        self.assertEqual(start.status_code, status.HTTP_200_OK)
        invalid = self.client.post(f"/api/admissions/visits/{visit.id}/vital-signs/", {"oxygen_saturation": 120}, format="json")
        self.assertEqual(invalid.status_code, status.HTTP_400_BAD_REQUEST)
        signs = self.client.post(f"/api/admissions/visits/{visit.id}/vital-signs/", {"weight": "80.00", "height": "1.80", "oxygen_saturation": 98}, format="json")
        self.assertEqual(signs.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(signs.data["bmi"]), Decimal("24.69"))
        done = self.client.patch(
            f"/api/admissions/visits/{visit.id}/complete-triage/",
            {"chief_complaint": "Dolor abdominal", "initial_assessment": "Paciente consciente y orientado.", "priority": "urgent", "notes": "Vigilar dolor."},
            format="json",
        )
        self.assertEqual(done.status_code, status.HTTP_200_OK)
        self.assertEqual(done.data["status"], PatientVisit.Status.WAITING_DOCTOR)
        self.assertTrue(AuditLog.objects.filter(module=AuditLog.Module.ADMISSIONS, action=AuditLog.Action.UPDATE, object_id=str(visit.id), description="Triaje iniciado.").exists())
        self.assertTrue(AuditLog.objects.filter(module=AuditLog.Module.MEDICAL_RECORDS, action=AuditLog.Action.CREATE, object_id=str(signs.data["id"]), description="Signos vitales registrados.").exists())
        self.assertTrue(AuditLog.objects.filter(module=AuditLog.Module.ADMISSIONS, action=AuditLog.Action.FINALIZE, object_id=str(visit.id), description="Triaje finalizado.").exists())

    def test_cola_triaje_filtra_rol_clinica_configuracion_y_ordena_prioridad(self):
        normal = self.register_visit()
        urgent = PatientVisit.objects.create(
            clinic=self.clinic,
            patient=self.patient_two,
            reason="Fiebre alta",
            priority=PatientVisit.Priority.EMERGENCY,
        )
        PatientVisit.objects.create(
            clinic=self.other_clinic,
            patient=self.other_patient,
            reason="Paciente externo",
        )
        self.auth(self.nurse)
        response = self.client.get("/api/admissions/triage-queue/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([row["id"] for row in response.data], [urgent.id, normal.id])
        self.assertTrue(all(row["clinic"] == self.clinic.id for row in response.data))
        normal_data = next(row for row in response.data if row["id"] == normal.id)
        self.assertEqual(normal_data["patient_alergias"], "Penicilina")

        self.auth(self.rec)
        self.assertEqual(self.client.get("/api/admissions/triage-queue/").status_code, status.HTTP_403_FORBIDDEN)
        reception_visit = self.client.get(f"/api/admissions/visits/{normal.id}/")
        self.assertIsNone(reception_visit.data["patient_alergias"])
        self.assertIsNone(reception_visit.data["patient_enfermedades_cronicas"])

        workflow = get_or_create_workflow_settings(self.clinic)
        workflow.walk_in_requires_triage = False
        workflow.save()
        self.auth(self.nurse)
        self.assertEqual(self.client.get("/api/admissions/triage-queue/").data, [])
        blocked = self.client.patch(f"/api/admissions/visits/{normal.id}/start-triage/")
        self.assertEqual(blocked.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("configuracion", blocked.data["detail"].lower())

    def test_inicio_triaje_es_idempotente_y_excluye_segunda_enfermera(self):
        visit = self.register_visit()
        self.auth(self.nurse)
        first = self.client.patch(f"/api/admissions/visits/{visit.id}/start-triage/")
        second = self.client.patch(f"/api/admissions/visits/{visit.id}/start-triage/")
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertTrue(first.data["triage_started"])
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertFalse(second.data["triage_started"])
        self.assertEqual(AuditLog.objects.filter(description="Triaje iniciado.", object_id=str(visit.id)).count(), 1)

        self.auth(self.nurse_two)
        conflict = self.client.patch(f"/api/admissions/visits/{visit.id}/start-triage/")
        self.assertEqual(conflict.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("otro usuario", conflict.data["detail"].lower())

    def test_enfermeria_no_puede_operar_visita_de_otra_clinica(self):
        other_visit = PatientVisit.objects.create(clinic=self.other_clinic, patient=self.other_patient, reason="Dolor intenso")
        self.auth(self.nurse)
        for method, url, payload in [
            (self.client.patch, f"/api/admissions/visits/{other_visit.id}/start-triage/", {}),
            (self.client.post, f"/api/admissions/visits/{other_visit.id}/vital-signs/", {"heart_rate": 80}),
            (self.client.patch, f"/api/admissions/visits/{other_visit.id}/complete-triage/", {"chief_complaint": "Dolor intenso", "initial_assessment": "Paciente estable y orientado.", "priority": "normal"}),
        ]:
            self.assertEqual(method(url, payload, format="json").status_code, status.HTTP_404_NOT_FOUND)

    def test_signos_vitales_validan_campos_alertas_imc_y_no_duplican(self):
        visit = self.register_visit()
        self.auth(self.nurse)
        self.client.patch(f"/api/admissions/visits/{visit.id}/start-triage/")
        invalid_payloads = [
            {},
            {"oxygen_saturation": 101},
            {"pain_scale": 11},
            {"weight": "70.00"},
            {"blood_pressure_systolic": 80, "blood_pressure_diastolic": 90},
        ]
        for payload in invalid_payloads:
            self.assertEqual(self.client.post(f"/api/admissions/visits/{visit.id}/vital-signs/", payload, format="json").status_code, status.HTTP_400_BAD_REQUEST)

        warning = self.client.post(f"/api/admissions/visits/{visit.id}/vital-signs/", {"oxygen_saturation": 90}, format="json")
        self.assertEqual(warning.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(warning.data["confirmation_required"])
        confirmed = self.client.post(
            f"/api/admissions/visits/{visit.id}/vital-signs/",
            {"oxygen_saturation": 90, "weight": "80.00", "height": "1.80", "confirm_out_of_range": True},
            format="json",
        )
        self.assertEqual(confirmed.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(confirmed.data["bmi"]), Decimal("24.69"))
        updated = self.client.post(f"/api/admissions/visits/{visit.id}/vital-signs/", {"heart_rate": 75}, format="json")
        self.assertEqual(updated.status_code, status.HTTP_200_OK)
        self.assertEqual(updated.data["id"], confirmed.data["id"])
        self.assertEqual(VitalSigns.objects.filter(patient_visit=visit).count(), 1)
        self.assertTrue(AuditLog.objects.filter(description="Advertencia de signos vitales confirmada por enfermeria.").exists())

    def test_signos_solo_durante_triaje_y_medico_solo_lectura(self):
        visit = self.register_visit()
        self.auth(self.nurse)
        self.assertEqual(self.client.post(f"/api/admissions/visits/{visit.id}/vital-signs/", {"heart_rate": 80}, format="json").status_code, status.HTTP_400_BAD_REQUEST)
        self.start_and_record_signs(visit)
        self.auth(self.doctor_user)
        self.assertEqual(self.client.get(f"/api/admissions/visits/{visit.id}/vital-signs/").status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.post(f"/api/admissions/visits/{visit.id}/vital-signs/", {"heart_rate": 90}, format="json").status_code, status.HTTP_403_FORBIDDEN)

    def test_completar_exige_datos_es_idempotente_y_mueve_a_sala_medica(self):
        visit = self.register_visit()
        self.auth(self.nurse)
        self.client.patch(f"/api/admissions/visits/{visit.id}/start-triage/")
        missing = self.client.patch(f"/api/admissions/visits/{visit.id}/complete-triage/", {}, format="json")
        self.assertEqual(missing.status_code, status.HTTP_400_BAD_REQUEST)
        self.client.post(f"/api/admissions/visits/{visit.id}/vital-signs/", {"heart_rate": 80}, format="json")
        payload = {"chief_complaint": "Dolor de cabeza", "initial_assessment": "Paciente alerta, estable y orientado.", "priority": "priority", "notes": "Continuar vigilancia."}
        done = self.client.patch(f"/api/admissions/visits/{visit.id}/complete-triage/", payload, format="json")
        self.assertEqual(done.status_code, status.HTTP_200_OK)
        self.assertTrue(done.data["triage_completed"])
        visit.refresh_from_db()
        self.assertEqual(visit.status, PatientVisit.Status.WAITING_DOCTOR)
        self.assertEqual(visit.priority, PatientVisit.Priority.PRIORITY)
        self.assertIsNotNone(visit.triage_completed_at)

        retry = self.client.patch(f"/api/admissions/visits/{visit.id}/complete-triage/", {}, format="json")
        self.assertEqual(retry.status_code, status.HTTP_200_OK)
        self.assertFalse(retry.data["triage_completed"])
        self.assertEqual(AuditLog.objects.filter(description="Triaje finalizado.", object_id=str(visit.id)).count(), 1)
        self.assertNotIn(visit.id, [row["id"] for row in self.client.get("/api/admissions/triage-queue/").data])

        self.auth(self.doctor_user)
        room = self.client.get("/api/admissions/doctor-waiting-room/")
        self.assertEqual(room.status_code, status.HTTP_200_OK)
        self.assertIn(visit.id, [row["id"] for row in room.data])
        row = next(row for row in room.data if row["id"] == visit.id)
        self.assertEqual(row["initial_assessment"], payload["initial_assessment"])
        self.assertIsNotNone(row["vital_signs"])

    def test_historial_completado_no_mezcla_visita_directa_a_medico(self):
        triaged = self.register_visit()
        self.start_and_record_signs(triaged)
        payload = {"chief_complaint": "Dolor abdominal", "initial_assessment": "Paciente estable durante evaluación.", "priority": "normal"}
        self.client.patch(f"/api/admissions/visits/{triaged.id}/complete-triage/", payload, format="json")
        direct = PatientVisit.objects.create(clinic=self.clinic, patient=self.patient_two, reason="Consulta directa", status=PatientVisit.Status.WAITING_DOCTOR)
        history = self.client.get("/api/admissions/visits/?status=waiting_doctor&triage_completed=true")
        ids = [row["id"] for row in history.data]
        self.assertIn(triaged.id, ids)
        self.assertNotIn(direct.id, ids)

    def test_visitas_canceladas_o_completadas_no_reabren_triaje(self):
        for visit_status in [PatientVisit.Status.CANCELLED, PatientVisit.Status.COMPLETED, PatientVisit.Status.IN_CONSULTATION]:
            patient = Patient.objects.create(clinic=self.clinic, nombres=f"Estado {visit_status}", apellidos="Prueba")
            visit = PatientVisit.objects.create(clinic=self.clinic, patient=patient, reason="Control estado", status=visit_status)
            self.auth(self.nurse)
            response = self.client.patch(f"/api/admissions/visits/{visit.id}/start-triage/")
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_medico_sala_inicia_consulta_y_finaliza_a_caja(self):
        visit = self.register_visit()
        visit.status = PatientVisit.Status.WAITING_DOCTOR
        visit.save(update_fields=["status"])
        self.auth(self.doctor_user)
        waiting = self.client.get("/api/admissions/doctor-waiting-room/")
        self.assertEqual(len(waiting.data), 1)
        started = self.client.patch(f"/api/admissions/visits/{visit.id}/start-consultation/")
        self.assertEqual(started.status_code, status.HTTP_200_OK)
        visit.refresh_from_db()
        self.assertTrue(ClinicalConsultation.objects.filter(patient_visit=visit).exists())
        consultation = visit.consultation
        consultation.chief_complaint = "Dolor"
        consultation.clinical_assessment = "Estable"
        consultation.finalize(self.doctor_user)
        visit.refresh_from_db()
        self.assertEqual(visit.status, PatientVisit.Status.WAITING_BILLING)

    def test_caja_ve_pendiente_y_genera_factura_sin_duplicar(self):
        visit = self.register_visit()
        visit.status = PatientVisit.Status.WAITING_BILLING
        visit.save(update_fields=["status"])
        usage = ClinicalSupplyUsage.objects.create(clinic=self.clinic, patient=self.patient, inventory_item=self.item, quantity=1, unit_price=Decimal("200.00"), billable=True)
        self.auth(self.rec)
        pending = self.client.get("/api/billing/pending-visits/")
        self.assertEqual(len(pending.data), 1)
        res = self.client.post(f"/api/billing/visits/{visit.id}/generate-invoice/")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        usage.refresh_from_db()
        self.assertTrue(usage.invoiced)
        duplicate = self.client.post(f"/api/billing/visits/{visit.id}/generate-invoice/")
        self.assertEqual(duplicate.status_code, status.HTTP_400_BAD_REQUEST)

    def test_usuario_no_ve_visitas_de_otra_clinica(self):
        visit = PatientVisit.objects.create(clinic=self.other_clinic, patient=self.other_patient, medical_record=MedicalRecord.objects.create(patient=self.other_patient), reason="X")
        self.auth(self.rec)
        res = self.client.get("/api/admissions/visits/")
        self.assertEqual(len(res.data), 0)
        self.assertEqual(self.client.get(f"/api/admissions/visits/{visit.id}/").status_code, status.HTTP_404_NOT_FOUND)
