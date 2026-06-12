from datetime import time
from decimal import Decimal

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.admissions.models import PatientVisit
from apps.appointments.models import Appointment
from apps.clinics.models import Clinic
from apps.doctors.models import DoctorProfile, DoctorSchedule, MedicalSpecialty
from apps.inventory.models import InventoryCategory, InventoryItem
from apps.medical_records.models import ClinicalConsultation, ClinicalSupplyUsage, MedicalRecord
from apps.patients.models import Patient


class AdmissionsFlowTests(APITestCase):
    def setUp(self):
        self.roles = {name: Role.objects.create(nombre=name) for name in ["admin", "recepcionista", "enfermera", "medico", "paciente"]}
        self.clinic = Clinic.objects.create(nombre="Clinica Demo")
        self.other_clinic = Clinic.objects.create(nombre="Otra")
        self.admin = User.objects.create_user(email="admin@x.com", password="x", role=self.roles["admin"], clinica=self.clinic)
        self.rec = User.objects.create_user(email="rec@x.com", password="x", role=self.roles["recepcionista"], clinica=self.clinic)
        self.nurse = User.objects.create_user(email="nurse@x.com", password="x", role=self.roles["enfermera"], clinica=self.clinic)
        self.doctor_user = User.objects.create_user(email="doc@x.com", password="x", role=self.roles["medico"], clinica=self.clinic)
        self.specialty = MedicalSpecialty.objects.create(nombre="General")
        self.doctor = DoctorProfile.objects.create(clinic=self.clinic, user=self.doctor_user, specialty=self.specialty, numero_colegiacion="MED-1")
        DoctorSchedule.objects.create(doctor=self.doctor, dia_semana="jueves", hora_inicio=time(8, 0), hora_fin=time(17, 0))
        self.patient = Patient.objects.create(clinic=self.clinic, nombres="Juan", apellidos="Perez", identidad="0801")
        self.other_patient = Patient.objects.create(clinic=self.other_clinic, nombres="Ana", apellidos="Lopez", identidad="0802")
        self.category = InventoryCategory.objects.create(clinic=self.clinic, name="Medicamentos")
        self.item = InventoryItem.objects.create(clinic=self.clinic, category=self.category, name="Suero", sale_price=Decimal("200.00"), stock_current=Decimal("2.00"))

    def auth(self, user):
        self.client.force_authenticate(user=user)

    def register_visit(self):
        self.auth(self.rec)
        res = self.client.post("/api/admissions/register-walk-in/", {"patient": self.patient.id, "visit": {"reason": "Dolor", "symptoms": "Dolor abdominal", "assigned_doctor": self.doctor.id}}, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        return PatientVisit.objects.get(id=res.data["id"])

    def test_recepcion_registra_paciente_nuevo_sin_cita_y_crea_expediente(self):
        self.auth(self.rec)
        res = self.client.post(
            "/api/admissions/register-walk-in/",
            {"patient": None, "patient_data": {"nombres": "Luis", "apellidos": "Mora", "identidad": "999", "genero": "masculino"}, "visit": {"reason": "Fiebre", "symptoms": "2 dias"}},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        patient = Patient.objects.get(identidad="999")
        self.assertTrue(MedicalRecord.objects.filter(patient=patient).exists())
        self.assertEqual(res.data["patient"], patient.id)

    def test_si_paciente_existe_no_duplica_por_identidad(self):
        self.auth(self.rec)
        res = self.client.post(
            "/api/admissions/register-walk-in/",
            {"patient": None, "patient_data": {"nombres": "Juan 2", "apellidos": "Perez", "identidad": "0801"}, "visit": {"reason": "Dolor"}},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Patient.objects.filter(clinic=self.clinic, identidad="0801").count(), 1)
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
        self.assertEqual(res.data["appointment"], appt.id)

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
        done = self.client.patch(f"/api/admissions/visits/{visit.id}/complete-triage/")
        self.assertEqual(done.status_code, status.HTTP_200_OK)
        self.assertEqual(done.data["status"], PatientVisit.Status.WAITING_DOCTOR)

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
        PatientVisit.objects.create(clinic=self.other_clinic, patient=self.other_patient, medical_record=MedicalRecord.objects.create(patient=self.other_patient), reason="X")
        self.auth(self.rec)
        res = self.client.get("/api/admissions/visits/")
        self.assertEqual(len(res.data), 0)
