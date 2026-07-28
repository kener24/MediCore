from decimal import Decimal

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.admissions.models import PatientVisit
from apps.billing.models import BillableService, CashMovement, CashSession, Invoice, InvoiceItem, Payment
from apps.clinics.models import Clinic
from apps.doctors.models import DoctorProfile, MedicalSpecialty
from apps.medical_records.models import ClinicalConsultation, MedicalRecord
from apps.patients.models import Patient


class BillingCashSprint14CertificationTests(APITestCase):
    def setUp(self):
        self.roles = {name: Role.objects.create(nombre=name) for name in ["admin", "recepcionista", "medico", "paciente"]}
        self.clinic_a = Clinic.objects.create(nombre="Clinica A")
        self.clinic_b = Clinic.objects.create(nombre="Clinica B")
        self.admin_a = User.objects.create_user(email="admin-a@test.local", password="x", role=self.roles["admin"], clinica=self.clinic_a)
        self.cashier_a = User.objects.create_user(email="cash-a@test.local", password="x", role=self.roles["recepcionista"], clinica=self.clinic_a)
        self.cashier_b = User.objects.create_user(email="cash-b@test.local", password="x", role=self.roles["recepcionista"], clinica=self.clinic_b)
        self.doctor_user = User.objects.create_user(email="doctor-a@test.local", password="x", role=self.roles["medico"], clinica=self.clinic_a)
        self.patient_a = Patient.objects.create(clinic=self.clinic_a, nombres="Paciente", apellidos="A")
        self.patient_b = Patient.objects.create(clinic=self.clinic_b, nombres="Paciente", apellidos="B")
        self.patient_user = User.objects.create_user(email="patient-a@test.local", password="x", role=self.roles["paciente"], clinica=self.clinic_a)
        self.patient_a.user = self.patient_user
        self.patient_a.save(update_fields=["user", "actualizado_en"])
        self.record_a = MedicalRecord.objects.create(patient=self.patient_a, clinic=self.clinic_a)
        specialty = MedicalSpecialty.objects.create(nombre="Medicina general")
        self.doctor = DoctorProfile.objects.create(clinic=self.clinic_a, user=self.doctor_user, specialty=specialty, numero_colegiacion="TEST-1")
        BillableService.objects.create(clinic=self.clinic_a, name="Consulta general", code="CONSULTA", price=Decimal("1000.00"))

    def auth(self, user):
        self.client.force_authenticate(user=user)

    def finished_visit(self):
        visit = PatientVisit.objects.create(
            clinic=self.clinic_a,
            patient=self.patient_a,
            medical_record=self.record_a,
            reason="Consulta general",
            status=PatientVisit.Status.WAITING_BILLING,
            assigned_doctor=self.doctor,
        )
        consultation = ClinicalConsultation.objects.create(
            clinic=self.clinic_a,
            medical_record=self.record_a,
            patient=self.patient_a,
            doctor=self.doctor,
            patient_visit=visit,
            chief_complaint="Consulta general",
            clinical_assessment="Paciente estable",
            status=ClinicalConsultation.Status.FINALIZADA,
            finalized_by=self.doctor_user,
            finalized_at=timezone.now(),
        )
        visit.consultation = consultation
        visit.consultation_completed_at = timezone.now()
        visit.save(update_fields=["consultation", "consultation_completed_at", "actualizado_en"])
        return visit

    def generate_invoice(self, visit):
        self.auth(self.cashier_a)
        response = self.client.post(f"/api/billing/visits/{visit.id}/generate-invoice/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return Invoice.objects.get(pk=response.data["id"])

    def open_cash(self):
        self.auth(self.cashier_a)
        response = self.client.post("/api/billing/cash-sessions/open/", {"opening_amount": "0.00"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return CashSession.objects.get(pk=response.data["id"])

    def pay(self, invoice, amount, key, method="efectivo", reference=""):
        return self.client.post(
            f"/api/billing/invoices/{invoice.id}/payments/",
            {"amount": amount, "method": method, "reference": reference},
            format="json",
            HTTP_IDEMPOTENCY_KEY=key,
        )

    def test_visit_invoice_is_idempotent_and_does_not_duplicate_charge(self):
        visit = self.finished_visit()
        invoice = self.generate_invoice(visit)
        first_items = list(invoice.items.values_list("id", flat=True))
        repeated = self.client.post(f"/api/billing/visits/{visit.id}/generate-invoice/", {}, format="json")
        self.assertEqual(repeated.status_code, status.HTTP_200_OK)
        self.assertFalse(repeated.data["created"])
        self.assertEqual(repeated.data["id"], invoice.id)
        self.assertEqual(list(invoice.items.values_list("id", flat=True)), first_items)
        self.assertEqual(invoice.total_amount, Decimal("1000.00"))

    def test_partial_payments_idempotency_cash_movement_and_visit_completion(self):
        visit = self.finished_visit()
        invoice = self.generate_invoice(visit)
        session = self.open_cash()

        first = self.pay(invoice, "300.00", "s14-payment-1")
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        repeated = self.pay(invoice, "300.00", "s14-payment-1")
        self.assertEqual(repeated.status_code, status.HTTP_200_OK)
        self.assertEqual(first.data["id"], repeated.data["id"])
        invoice.refresh_from_db()
        visit.refresh_from_db()
        self.assertEqual(invoice.status, Invoice.Status.PARCIAL)
        self.assertEqual(invoice.paid_amount, Decimal("300.00"))
        self.assertEqual(invoice.balance_due, Decimal("700.00"))
        self.assertEqual(visit.status, PatientVisit.Status.WAITING_PAYMENT)
        self.assertEqual(Payment.objects.filter(invoice=invoice).count(), 1)
        self.assertEqual(CashMovement.objects.filter(cash_session=session, movement_type=CashMovement.Type.PAGO).count(), 1)

        final = self.pay(invoice, "700.00", "s14-payment-2")
        self.assertEqual(final.status_code, status.HTTP_201_CREATED)
        invoice.refresh_from_db()
        visit.refresh_from_db()
        self.assertEqual(invoice.status, Invoice.Status.PAGADA)
        self.assertEqual(invoice.balance_due, Decimal("0.00"))
        self.assertEqual(visit.status, PatientVisit.Status.COMPLETED)
        self.assertIsNotNone(visit.completed_at)

    def test_non_cash_payment_is_not_added_to_expected_physical_cash(self):
        invoice = self.generate_invoice(self.finished_visit())
        session = self.open_cash()
        card = self.pay(invoice, "400.00", "s14-card", method="tarjeta", reference="POS-123")
        self.assertEqual(card.status_code, status.HTTP_201_CREATED)
        cash = self.pay(invoice, "100.00", "s14-cash")
        self.assertEqual(cash.status_code, status.HTTP_201_CREATED)
        session.refresh_from_db()
        cash_total, income, expense = session.totals()
        self.assertEqual(cash_total, Decimal("100.00"))
        self.assertEqual(income, Decimal("0.00"))
        self.assertEqual(expense, Decimal("0.00"))

    def test_manual_movement_is_idempotent_and_close_requires_difference_reason(self):
        session = self.open_cash()
        payload = {"movement_type": "ingreso", "amount": "50.00", "reason": "Ingreso operativo", "idempotency_key": "s14-movement"}
        first = self.client.post(f"/api/billing/cash-sessions/{session.id}/movements/", payload, format="json", HTTP_IDEMPOTENCY_KEY="s14-movement")
        repeated = self.client.post(f"/api/billing/cash-sessions/{session.id}/movements/", payload, format="json", HTTP_IDEMPOTENCY_KEY="s14-movement")
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(repeated.status_code, status.HTTP_200_OK)
        self.assertEqual(first.data["id"], repeated.data["id"])
        self.assertEqual(CashMovement.objects.filter(cash_session=session, movement_type=CashMovement.Type.INGRESO).count(), 1)
        rejected = self.client.patch(f"/api/billing/cash-sessions/{session.id}/close/", {"closing_amount": "40.00"}, format="json")
        self.assertEqual(rejected.status_code, status.HTTP_400_BAD_REQUEST)
        closed = self.client.patch(f"/api/billing/cash-sessions/{session.id}/close/", {"closing_amount": "40.00", "notes": "Faltante verificado"}, format="json")
        self.assertEqual(closed.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(closed.data["expected_amount"]), Decimal("50.00"))
        self.assertEqual(Decimal(closed.data["difference_amount"]), Decimal("-10.00"))

    def test_cross_clinic_resources_are_not_operable(self):
        invoice = self.generate_invoice(self.finished_visit())
        session = self.open_cash()
        self.auth(self.cashier_b)
        payment = self.client.post(f"/api/billing/invoices/{invoice.id}/payments/", {"amount": "10.00", "method": "tarjeta", "reference": "X"}, format="json", HTTP_IDEMPOTENCY_KEY="cross")
        close = self.client.patch(f"/api/billing/cash-sessions/{session.id}/close/", {"closing_amount": "0.00"}, format="json")
        invoice_pdf = self.client.get(f"/api/billing/invoices/{invoice.id}/pdf/")
        self.assertEqual(payment.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(close.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(invoice_pdf.status_code, status.HTTP_404_NOT_FOUND)

    def test_invoice_and_payment_receipts_are_secure_pdf(self):
        invoice = self.generate_invoice(self.finished_visit())
        self.open_cash()
        payment_response = self.pay(invoice, "100.00", "s14-receipt")
        invoice_pdf = self.client.get(f"/api/billing/invoices/{invoice.id}/pdf/")
        receipt_pdf = self.client.get(f"/api/billing/payments/{payment_response.data['id']}/receipt-pdf/")
        self.assertEqual(invoice_pdf.status_code, status.HTTP_200_OK)
        self.assertEqual(receipt_pdf.status_code, status.HTTP_200_OK)
        self.assertEqual(invoice_pdf["Content-Type"], "application/pdf")
        self.assertEqual(receipt_pdf["Content-Type"], "application/pdf")
        self.auth(self.patient_user)
        portal_receipt = self.client.get(f"/api/patient-portal/payments/{payment_response.data['id']}/receipt-pdf/")
        self.assertEqual(portal_receipt.status_code, status.HTTP_200_OK)
        self.assertEqual(portal_receipt["Content-Type"], "application/pdf")

        foreign_invoice = Invoice.objects.create(clinic=self.clinic_b, patient=self.patient_b, created_by=self.cashier_b)
        InvoiceItem.objects.create(
            invoice=foreign_invoice,
            item_type=InvoiceItem.Type.MANUAL,
            description="Servicio de prueba",
            quantity=Decimal("1.00"),
            unit_price=Decimal("1.00"),
        )
        foreign_invoice.refresh_from_db()
        foreign_payment = Payment.objects.create(
            clinic=self.clinic_b,
            invoice=foreign_invoice,
            patient=self.patient_b,
            amount=Decimal("1.00"),
            method=Payment.Method.TARJETA,
            reference="FOREIGN",
            received_by=self.cashier_b,
        )
        blocked = self.client.get(f"/api/patient-portal/payments/{foreign_payment.id}/receipt-pdf/")
        self.assertEqual(blocked.status_code, status.HTTP_404_NOT_FOUND)

    def test_reception_cannot_apply_discount_without_permission(self):
        invoice = self.generate_invoice(self.finished_visit())
        item = invoice.items.first()
        denied = self.client.patch(f"/api/billing/invoices/{invoice.id}/items/{item.id}/", {"discount_amount": "25.00"}, format="json")
        self.assertEqual(denied.status_code, status.HTTP_403_FORBIDDEN)
        self.auth(self.admin_a)
        allowed = self.client.patch(f"/api/billing/invoices/{invoice.id}/items/{item.id}/", {"discount_amount": "25.00"}, format="json")
        self.assertEqual(allowed.status_code, status.HTTP_200_OK)
