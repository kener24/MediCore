from datetime import date, timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.billing.models import Invoice
from apps.clinics.models import Clinic
from apps.doctors.models import DoctorProfile, MedicalSpecialty
from apps.hospitalization.models import (
    DischargeSummary,
    HospitalBed,
    HospitalRoom,
    Hospitalization,
    MedicalInstruction,
    MedicationAdministration,
)
from apps.inventory.models import InventoryCategory, InventoryItem, InventoryLot, InventoryMovement
from apps.medical_records.models import ClinicalSupplyUsage
from apps.patients.models import Patient
from apps.subscriptions.models import ClinicSubscription, SubscriptionPlan


class Sprint16BHospitalMedicationAndDischargeTests(APITestCase):
    def setUp(self):
        self.roles = {name: Role.objects.create(nombre=name) for name in ["admin", "medico", "enfermera", "paciente"]}
        self.clinic_a = Clinic.objects.create(nombre="Clinica Hospital A", correo="hospital-a@example.test")
        self.clinic_b = Clinic.objects.create(nombre="Clinica Hospital B", correo="hospital-b@example.test")
        plan = SubscriptionPlan.objects.create(name="Hospital 16B", code="hospital-16b", allow_patient_portal=True)
        ClinicSubscription.objects.create(clinic=self.clinic_a, plan=plan, status=ClinicSubscription.Status.ACTIVE)
        self.admin = self.user("admin16b@example.test", "admin", self.clinic_a)
        self.doctor_user = self.user("doctor16b@example.test", "medico", self.clinic_a)
        self.nurse = self.user("nurse16b@example.test", "enfermera", self.clinic_a)
        self.patient_user = self.user("patient16b@example.test", "paciente", self.clinic_a)
        self.other_nurse = self.user("nurse-b16b@example.test", "enfermera", self.clinic_b)
        specialty = MedicalSpecialty.objects.create(nombre="Medicina hospitalaria 16B")
        self.doctor = DoctorProfile.objects.create(clinic=self.clinic_a, user=self.doctor_user, specialty=specialty, numero_colegiacion="H-16B")
        self.patient = Patient.objects.create(clinic=self.clinic_a, user=self.patient_user, codigo_paciente="PAC-16B", nombres="Paciente", apellidos="Hospital", alergias="Penicilina")
        self.other_patient = Patient.objects.create(clinic=self.clinic_b, codigo_paciente="PAC-B16B", nombres="Paciente", apellidos="Ajeno")
        room = HospitalRoom.objects.create(clinic=self.clinic_a, name="Hospitalizacion", room_number="H16B")
        self.bed = HospitalBed.objects.create(clinic=self.clinic_a, room=room, bed_number="1")
        self.hospitalization = Hospitalization.objects.create(clinic=self.clinic_a, patient=self.patient, admitted_by=self.admin, reason="Certificacion Sprint 16B")
        category = InventoryCategory.objects.create(clinic=self.clinic_a, name="Medicamentos 16B")
        self.item = InventoryItem.objects.create(
            clinic=self.clinic_a,
            category=category,
            name="Acetaminofen",
            item_type=InventoryItem.Type.MEDICAMENTO,
            stock_current=Decimal("8.00"),
            sale_price=Decimal("25.00"),
            requires_lot=True,
            requires_expiration=True,
        )
        self.lot_early = InventoryLot.objects.create(clinic=self.clinic_a, item=self.item, lot_number="FEFO-16B-1", expiration_date=date.today() + timedelta(days=10), quantity_current=Decimal("2.00"))
        self.lot_late = InventoryLot.objects.create(clinic=self.clinic_a, item=self.item, lot_number="FEFO-16B-2", expiration_date=date.today() + timedelta(days=30), quantity_current=Decimal("6.00"))

    def user(self, email, role, clinic):
        return User.objects.create(email=email, password="!", nombre_completo=email.split("@")[0], role=self.roles[role], clinica=clinic, is_active=True)

    def auth(self, user):
        self.client.force_authenticate(user=user)

    def create_instruction(self, *, quantity="1.00", interval=8, item=None, override=""):
        self.auth(self.doctor_user)
        payload = {
            "instruction_type": MedicalInstruction.InstructionType.MEDICATION,
            "title": (item or self.item).name,
            "details": "Administrar segun indicacion medica.",
            "inventory_item": (item or self.item).id,
            "dose": "500.00",
            "dose_unit": "mg",
            "route": "oral",
            "interval_hours": interval,
            "inventory_quantity": quantity,
            "effective_from": timezone.now(),
            "effective_until": timezone.now() + timedelta(hours=interval * 3),
            "allergy_override_reason": override,
        }
        response = self.client.post(f"/api/hospitalization/admissions/{self.hospitalization.id}/instructions/", payload, format="json")
        return response

    def next_administration(self):
        return MedicationAdministration.objects.filter(hospitalization=self.hospitalization, status=MedicationAdministration.Status.SCHEDULED).order_by("scheduled_time").first()

    def test_allergy_warning_requires_medical_justification(self):
        penicillin = InventoryItem.objects.create(clinic=self.clinic_a, category=self.item.category, name="Amoxicilina", item_type=InventoryItem.Type.MEDICAMENTO, stock_current=Decimal("1.00"))
        blocked = self.create_instruction(item=penicillin)
        self.assertEqual(blocked.status_code, status.HTTP_400_BAD_REQUEST)
        allowed = self.create_instruction(item=penicillin, override="Beneficio clinico supera riesgo documentado")
        self.assertEqual(allowed.status_code, status.HTTP_201_CREATED)
        self.assertIn("penicilina", allowed.data["allergy_warning"])

    def test_schedule_does_not_consume_and_administration_is_fefo_and_idempotent(self):
        created = self.create_instruction(quantity="4.00")
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertGreater(MedicationAdministration.objects.filter(instruction_id=created.data["id"]).count(), 0)
        self.assertEqual(InventoryMovement.objects.count(), 0)
        administration = self.next_administration()
        self.auth(self.nurse)
        payload = {"administered_dose": "500.00", "dose_unit": "mg", "route": "oral", "inventory_quantity": "4.00", "idempotency_key": "dose-16b-1"}
        first = self.client.post(f"/api/hospitalization/medication-administrations/{administration.id}/administer/", payload, format="json")
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(ClinicalSupplyUsage.objects.filter(medication_administration=administration).count(), 2)
        self.assertEqual(InventoryMovement.objects.filter(reason="clinical_consumption").count(), 2)
        self.lot_early.refresh_from_db()
        self.lot_late.refresh_from_db()
        self.assertEqual(self.lot_early.quantity_current, Decimal("0.00"))
        self.assertEqual(self.lot_late.quantity_current, Decimal("4.00"))
        replay = self.client.post(f"/api/hospitalization/medication-administrations/{administration.id}/administer/", payload, format="json")
        self.assertEqual(replay.status_code, status.HTTP_200_OK)
        self.assertEqual(InventoryMovement.objects.filter(reason="clinical_consumption").count(), 2)
        conflicting_retry = self.client.post(
            f"/api/hospitalization/medication-administrations/{administration.id}/administer/",
            {**payload, "idempotency_key": "dose-16b-conflicting-device"},
            format="json",
        )
        self.assertEqual(conflicting_retry.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(InventoryMovement.objects.filter(reason="clinical_consumption").count(), 2)

    def test_omission_refusal_and_unavailable_never_consume_or_charge(self):
        self.create_instruction(interval=1)
        administrations = list(MedicationAdministration.objects.filter(hospitalization=self.hospitalization).order_by("scheduled_time")[:4])
        self.auth(self.nurse)
        actions = [("omit", "Paciente en ayunas"), ("refuse", "Paciente rechazo despues de explicacion"), ("unavailable", "No hay existencia disponible en unidad"), ("delay", "Paciente en procedimiento programado")]
        for administration, (action, reason) in zip(administrations, actions):
            response = self.client.post(f"/api/hospitalization/medication-administrations/{administration.id}/{action}/", {"reason": reason}, format="json")
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertIsNotNone(response.data["status_recorded_at"])
        self.assertEqual(ClinicalSupplyUsage.objects.count(), 0)
        self.assertEqual(InventoryMovement.objects.count(), 0)
        self.assertEqual(Invoice.objects.count(), 0)

    def test_reversal_restores_original_fefo_lots(self):
        self.create_instruction(quantity="4.00")
        administration = self.next_administration()
        self.auth(self.nurse)
        self.client.post(f"/api/hospitalization/medication-administrations/{administration.id}/administer/", {"administered_dose": "500", "dose_unit": "mg", "route": "oral", "inventory_quantity": "4", "idempotency_key": "reverse-dose"}, format="json")
        self.auth(self.admin)
        reversed_response = self.client.post(f"/api/hospitalization/medication-administrations/{administration.id}/reverse/", {"reason": "Registro confirmado por error"}, format="json")
        self.assertEqual(reversed_response.status_code, status.HTTP_200_OK)
        self.lot_early.refresh_from_db()
        self.lot_late.refresh_from_db()
        self.assertEqual(self.lot_early.quantity_current, Decimal("2.00"))
        self.assertEqual(self.lot_late.quantity_current, Decimal("6.00"))
        self.assertEqual(ClinicalSupplyUsage.objects.filter(status=ClinicalSupplyUsage.Status.CANCELLED).count(), 2)

    def test_discharge_requires_signed_summary_and_invoice_is_idempotent(self):
        self.auth(self.admin)
        self.client.post(f"/api/hospitalization/admissions/{self.hospitalization.id}/assign-bed/", {"bed": self.bed.id}, format="json")
        self.auth(self.doctor_user)
        requested = self.client.post(f"/api/hospitalization/admissions/{self.hospitalization.id}/request-discharge/", {"reason": "Mejoria clinica"}, format="json")
        self.assertEqual(requested.status_code, status.HTTP_200_OK)
        self.assertEqual(self.bed.assignments.filter(released_at__isnull=True).count(), 1)
        self.auth(self.admin)
        blocked = self.client.post(f"/api/hospitalization/admissions/{self.hospitalization.id}/discharge/", {"discharge_reason": "Mejoria"}, format="json")
        self.assertEqual(blocked.status_code, status.HTTP_400_BAD_REQUEST)
        self.auth(self.doctor_user)
        draft = self.client.post(f"/api/hospitalization/admissions/{self.hospitalization.id}/discharge-summary/", {"hospital_course": "Evolucion favorable", "discharge_diagnoses": "Condicion resuelta", "condition_at_discharge": "Estable", "recommendations": "Cumplir tratamiento", "follow_up_plan": "Control en siete dias"}, format="json")
        self.assertEqual(draft.status_code, status.HTTP_201_CREATED)
        signed = self.client.post(f"/api/hospitalization/admissions/{self.hospitalization.id}/sign-discharge-summary/", {"summary_id": draft.data["id"]}, format="json")
        self.assertEqual(signed.status_code, status.HTTP_200_OK)
        self.auth(self.admin)
        first_invoice = self.client.post(f"/api/hospitalization/admissions/{self.hospitalization.id}/hospital-invoice/", {}, format="json")
        second_invoice = self.client.post(f"/api/hospitalization/admissions/{self.hospitalization.id}/hospital-invoice/", {}, format="json")
        self.assertEqual(first_invoice.data["id"], second_invoice.data["id"])
        discharged = self.client.post(f"/api/hospitalization/admissions/{self.hospitalization.id}/discharge/", {"discharge_reason": "Mejoria"}, format="json")
        self.assertEqual(discharged.status_code, status.HTTP_200_OK)
        self.bed.refresh_from_db()
        self.assertEqual(self.bed.status, HospitalBed.Status.CLEANING)
        self.assertFalse(self.bed.assignments.filter(released_at__isnull=True).exists())
        self.assertEqual(Invoice.objects.filter(hospitalization=self.hospitalization).count(), 1)

    def test_multitenancy_and_patient_portal_only_expose_own_signed_summary(self):
        self.create_instruction()
        administration = self.next_administration()
        self.auth(self.other_nurse)
        self.assertEqual(self.client.post(f"/api/hospitalization/medication-administrations/{administration.id}/administer/", {}, format="json").status_code, status.HTTP_404_NOT_FOUND)
        summary = DischargeSummary.objects.create(hospitalization=self.hospitalization, doctor=self.doctor, hospital_course="Evolucion", discharge_diagnoses="Diagnostico", condition_at_discharge="Estable", recommendations="Control", follow_up_plan="Seguimiento", status=DischargeSummary.Status.SIGNED, signed_at=timezone.now(), signed_by=self.doctor_user)
        self.auth(self.patient_user)
        visible = self.client.get("/api/patient-portal/discharge-summaries/")
        self.assertEqual(visible.status_code, status.HTTP_200_OK)
        self.assertEqual([entry["id"] for entry in visible.data], [summary.id])
