from datetime import date, timedelta
from decimal import Decimal

from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.clinics.models import Clinic
from apps.doctors.models import DoctorProfile, MedicalSpecialty
from apps.inventory.models import InventoryCategory, InventoryItem, InventoryLot, InventoryMovement
from apps.medical_records.models import ClinicalConsultation, ClinicalSupplyUsage, MedicalRecord
from apps.patients.models import Patient


class ClinicalConsumptionCertificationTests(APITestCase):
    def setUp(self):
        doctor_role = Role.objects.create(nombre="medico")
        self.clinic = Clinic.objects.create(nombre="Clinica Consumos A")
        self.other_clinic = Clinic.objects.create(nombre="Clinica Consumos B")
        specialty = MedicalSpecialty.objects.create(nombre="Medicina Sprint 13B")
        self.doctor_user = User.objects.create_user(email="consumos-doc@x.com", password="x", nombre_completo="Medico A", role=doctor_role, clinica=self.clinic)
        self.doctor = DoctorProfile.objects.create(clinic=self.clinic, user=self.doctor_user, specialty=specialty, numero_colegiacion="CMH-C1")
        self.patient = Patient.objects.create(clinic=self.clinic, nombres="Paciente", apellidos="Consumo")
        record = MedicalRecord.objects.create(patient=self.patient)
        self.consultation = ClinicalConsultation.objects.create(
            clinic=self.clinic,
            medical_record=record,
            patient=self.patient,
            doctor=self.doctor,
            consultation_date=date.today(),
            chief_complaint="Aplicacion de insumo",
            created_by=self.doctor_user,
        )
        category = InventoryCategory.objects.create(clinic=self.clinic, name="Medicamentos prueba")
        self.item = InventoryItem.objects.create(
            clinic=self.clinic,
            category=category,
            name="Solucion de prueba",
            stock_current=Decimal("8.00"),
            sale_price=Decimal("25.00"),
            requires_lot=True,
            requires_expiration=True,
        )
        self.first_lot = InventoryLot.objects.create(
            clinic=self.clinic,
            item=self.item,
            lot_number="FEFO-1",
            expiration_date=date.today() + timedelta(days=10),
            quantity_current=Decimal("2.00"),
            cost_price=Decimal("10.00"),
        )
        self.second_lot = InventoryLot.objects.create(
            clinic=self.clinic,
            item=self.item,
            lot_number="FEFO-2",
            expiration_date=date.today() + timedelta(days=30),
            quantity_current=Decimal("6.00"),
            cost_price=Decimal("11.00"),
        )
        self.client.force_authenticate(self.doctor_user)

    def test_fefo_divide_lotes_y_reintento_es_idempotente(self):
        payload = {
            "inventory_item": self.item.id,
            "quantity": "4.00",
            "usage_type": "medication",
            "billable": True,
            "idempotency_key": "device-a-request-001",
        }
        created = self.client.post(f"/api/consultations/{self.consultation.id}/consumptions/", payload, format="json")
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertEqual(created.data["group_quantity"], "4.00")
        self.assertEqual(len(created.data["group_parts"]), 2)
        self.assertEqual(created.data["group_parts"][0]["inventory_lot_number"], "FEFO-1")
        self.assertEqual(InventoryMovement.objects.filter(reference_type="clinical_consumption").count(), 2)
        self.item.refresh_from_db()
        self.assertEqual(self.item.stock_current, Decimal("4.00"))
        self.assertEqual(self.client.delete(f"/api/clinical-consumptions/{created.data['id']}/").status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

        replay = self.client.post(f"/api/consultations/{self.consultation.id}/consumptions/", payload, format="json")
        self.assertEqual(replay.status_code, status.HTTP_200_OK)
        self.assertEqual(InventoryMovement.objects.filter(reference_type="clinical_consumption").count(), 2)
        self.item.refresh_from_db()
        self.assertEqual(self.item.stock_current, Decimal("4.00"))

    def test_reversion_restaura_cada_lote_original(self):
        created = self.client.post(
            f"/api/consultations/{self.consultation.id}/consumptions/",
            {"inventory_item": self.item.id, "quantity": "4.00", "idempotency_key": "reverse-001"},
            format="json",
        )
        for part in created.data["group_parts"]:
            response = self.client.patch(f"/api/clinical-consumptions/{part['id']}/cancel/", {"reason": "Registro aplicado por error"}, format="json")
            self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.first_lot.refresh_from_db()
        self.second_lot.refresh_from_db()
        self.item.refresh_from_db()
        self.assertEqual(self.first_lot.quantity_current, Decimal("2.00"))
        self.assertEqual(self.second_lot.quantity_current, Decimal("6.00"))
        self.assertEqual(self.item.stock_current, Decimal("8.00"))
        self.assertEqual(ClinicalSupplyUsage.objects.filter(status=ClinicalSupplyUsage.Status.CANCELLED).count(), 2)

    def test_lote_vencido_no_se_consume_y_stock_no_es_negativo(self):
        expired = InventoryLot.objects.create(
            clinic=self.clinic,
            item=self.item,
            lot_number="VENCIDO",
            expiration_date=date.today() - timedelta(days=1),
            quantity_current=Decimal("20.00"),
        )
        response = self.client.post(
            f"/api/consultations/{self.consultation.id}/consumptions/",
            {"inventory_item": self.item.id, "inventory_lot": expired.id, "quantity": "1.00", "idempotency_key": "expired-001"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.item.refresh_from_db()
        self.assertEqual(self.item.stock_current, Decimal("8.00"))

    def test_no_consume_producto_de_otra_clinica(self):
        other_category = InventoryCategory.objects.create(clinic=self.other_clinic, name="Otra")
        other_item = InventoryItem.objects.create(clinic=self.other_clinic, category=other_category, name="Producto ajeno", stock_current=10)
        response = self.client.post(
            f"/api/consultations/{self.consultation.id}/consumptions/",
            {"inventory_item": other_item.id, "quantity": "1.00", "idempotency_key": "cross-clinic"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        other_item.refresh_from_db()
        self.assertEqual(other_item.stock_current, Decimal("10.00"))
