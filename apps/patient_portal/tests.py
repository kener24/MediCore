from datetime import date, time, timedelta
from decimal import Decimal

from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.appointments.models import Appointment
from apps.audit.models import AuditLog
from apps.billing.models import CreditNote, Invoice, InvoiceItem, Payment
from apps.clinic_settings.models import get_or_create_clinic_settings, get_or_create_workflow_settings
from apps.clinics.models import Clinic
from apps.doctors.models import DoctorProfile, DoctorSchedule, MedicalSpecialty
from apps.documents.models import ClinicalDocument, DocumentCategory
from apps.medical_records.models import ClinicalConsultation, MedicalRecord
from apps.notifications.models import Notification
from apps.patients.models import Patient
from apps.prescriptions.models import MedicalOrder, Prescription


class PatientPortalSprint17ACertificationTests(APITestCase):
    def setUp(self):
        patient_role = Role.objects.create(nombre="paciente")
        doctor_role = Role.objects.create(nombre="medico")
        self.clinic_a = Clinic.objects.create(nombre="Clínica A")
        self.clinic_b = Clinic.objects.create(nombre="Clínica B")
        self.patient_user_a = User.objects.create_user(email="patient-a@test.local", password="x", role=patient_role, clinica=self.clinic_a)
        self.patient_user_a2 = User.objects.create_user(email="patient-a2@test.local", password="x", role=patient_role, clinica=self.clinic_a)
        self.patient_user_b = User.objects.create_user(email="patient-b@test.local", password="x", role=patient_role, clinica=self.clinic_b)
        self.patient_a = Patient.objects.create(clinic=self.clinic_a, user=self.patient_user_a, nombres="Paciente", apellidos="A")
        self.patient_a2 = Patient.objects.create(clinic=self.clinic_a, user=self.patient_user_a2, nombres="Paciente", apellidos="A2")
        self.patient_b = Patient.objects.create(clinic=self.clinic_b, user=self.patient_user_b, nombres="Paciente", apellidos="B")
        self.record_a = MedicalRecord.objects.create(clinic=self.clinic_a, patient=self.patient_a, allergies="Penicilina")
        self.record_a2 = MedicalRecord.objects.create(clinic=self.clinic_a, patient=self.patient_a2)
        self.record_b = MedicalRecord.objects.create(clinic=self.clinic_b, patient=self.patient_b)

        specialty = MedicalSpecialty.objects.create(nombre="Medicina general")
        doctor_user_a = User.objects.create_user(email="doctor-a@test.local", password="x", role=doctor_role, clinica=self.clinic_a)
        doctor_user_b = User.objects.create_user(email="doctor-b@test.local", password="x", role=doctor_role, clinica=self.clinic_b)
        self.doctor_a = DoctorProfile.objects.create(clinic=self.clinic_a, user=doctor_user_a, specialty=specialty, numero_colegiacion="A-1", atiende_virtual=True)
        self.doctor_b = DoctorProfile.objects.create(clinic=self.clinic_b, user=doctor_user_b, specialty=specialty, numero_colegiacion="B-1", atiende_virtual=True)
        self.next_monday = date.today() + timedelta(days=(7 - date.today().weekday()))
        self.second_monday = self.next_monday + timedelta(days=7)
        DoctorSchedule.objects.create(doctor=self.doctor_a, dia_semana="lunes", hora_inicio=time(8), hora_fin=time(12))
        DoctorSchedule.objects.create(doctor=self.doctor_b, dia_semana="lunes", hora_inicio=time(8), hora_fin=time(12))
        get_or_create_clinic_settings(self.clinic_a)
        get_or_create_clinic_settings(self.clinic_b)
        get_or_create_workflow_settings(self.clinic_a)
        get_or_create_workflow_settings(self.clinic_b)
        self.client.force_authenticate(self.patient_user_a)

    def appointment_payload(self, **overrides):
        payload = {
            "doctor": self.doctor_a.id,
            "scheduled_date": self.next_monday.isoformat(),
            "start_time": "08:00",
            "modality": "presencial",
            "reason": "Control médico general",
        }
        payload.update(overrides)
        return payload

    def create_appointment(self, patient=None, clinic=None, doctor=None, **overrides):
        values = {
            "clinic": clinic or self.clinic_a,
            "patient": patient or self.patient_a,
            "doctor": doctor or self.doctor_a,
            "scheduled_date": self.next_monday,
            "start_time": time(8),
            "end_time": time(8, 30),
            "reason": "Control médico",
        }
        values.update(overrides)
        return Appointment.objects.create(**values)

    def test_authenticated_patient_is_resolved_server_side_and_profile_fields_are_limited(self):
        response = self.client.patch(
            "/api/patient-portal/profile/",
            {"telefono": "+504 9999-0000", "patient_id": self.patient_a2.id, "clinic": self.clinic_b.id, "nombres": "Alterado"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.patient_a.refresh_from_db()
        self.patient_a2.refresh_from_db()
        self.assertEqual(self.patient_a.telefono, "+504 9999-0000")
        self.assertEqual(self.patient_a.nombres, "Paciente")
        self.assertEqual(self.patient_a2.telefono, "")
        self.clinic_a.activo = False
        self.clinic_a.save(update_fields=["activo", "actualizado_en"])
        self.assertEqual(self.client.get("/api/patient-portal/profile/").status_code, status.HTTP_403_FORBIDDEN)

    def test_booking_is_in_person_aware_idempotent_and_cross_clinic_safe(self):
        first = self.client.post(
            "/api/patient-portal/appointments/request/",
            self.appointment_payload(),
            format="json",
            HTTP_IDEMPOTENCY_KEY="patient-booking-1",
        )
        replay = self.client.post(
            "/api/patient-portal/appointments/request/",
            self.appointment_payload(),
            format="json",
            HTTP_IDEMPOTENCY_KEY="patient-booking-1",
        )
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(replay.status_code, status.HTTP_200_OK)
        self.assertEqual(first.data["id"], replay.data["id"])
        self.assertNotIn("patient", first.data)
        self.assertNotIn("created_by", first.data)
        self.assertNotIn("cancelled_by", first.data)
        self.assertEqual(Appointment.objects.filter(patient=self.patient_a).count(), 1)
        self.assertEqual(AuditLog.objects.filter(action=AuditLog.Action.CREATE, module=AuditLog.Module.APPOINTMENTS).count(), 1)

        cross_clinic = self.client.post(
            "/api/patient-portal/appointments/request/",
            self.appointment_payload(doctor=self.doctor_b.id, start_time="09:00"),
            format="json",
            HTTP_IDEMPOTENCY_KEY="cross-clinic",
        )
        self.assertEqual(cross_clinic.status_code, status.HTTP_400_BAD_REQUEST)

        workflow = get_or_create_workflow_settings(self.clinic_a)
        workflow.allow_online_appointments = False
        workflow.save(update_fields=["allow_online_appointments", "actualizado_en"])
        online = self.client.post(
            "/api/patient-portal/appointments/request/",
            self.appointment_payload(start_time="09:00", modality="online"),
            format="json",
            HTTP_IDEMPOTENCY_KEY="online-disabled",
        )
        self.assertEqual(online.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reschedule_updates_same_appointment_and_is_idempotent(self):
        appointment = self.create_appointment()
        payload = {"scheduled_date": self.second_monday.isoformat(), "start_time": "09:00", "reason": "Cambio de disponibilidad"}
        first = self.client.post(
            f"/api/patient-portal/appointments/{appointment.id}/reschedule/",
            payload,
            format="json",
            HTTP_IDEMPOTENCY_KEY="reschedule-1",
        )
        replay = self.client.post(
            f"/api/patient-portal/appointments/{appointment.id}/reschedule/",
            payload,
            format="json",
            HTTP_IDEMPOTENCY_KEY="reschedule-1",
        )
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(replay.status_code, status.HTTP_200_OK)
        appointment.refresh_from_db()
        self.assertEqual(appointment.scheduled_date, self.second_monday)
        self.assertEqual(appointment.status, Appointment.Status.REPROGRAMADA)
        self.assertEqual(Appointment.objects.filter(patient=self.patient_a).count(), 1)
        self.assertEqual(AuditLog.objects.filter(action=AuditLog.Action.UPDATE, module=AuditLog.Module.APPOINTMENTS).count(), 1)

    def test_past_pending_appointment_has_no_actions_and_cannot_be_rescheduled(self):
        past_monday = self.next_monday - timedelta(days=14)
        appointment = self.create_appointment(scheduled_date=past_monday)
        detail = self.client.get(f"/api/patient-portal/appointments/{appointment.id}/")
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertFalse(detail.data["can_cancel"])
        self.assertFalse(detail.data["can_reschedule"])
        response = self.client.post(
            f"/api/patient-portal/appointments/{appointment.id}/reschedule/",
            {"scheduled_date": self.second_monday.isoformat(), "start_time": "09:00", "reason": "Intento tardio"},
            format="json",
            HTTP_IDEMPOTENCY_KEY="past-reschedule",
        )
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    def test_cancellation_requires_reason_and_foreign_appointment_is_hidden(self):
        own = self.create_appointment()
        foreign = self.create_appointment(patient=self.patient_a2, start_time=time(9), end_time=time(9, 30))
        invalid = self.client.post(f"/api/patient-portal/appointments/{own.id}/cancel/", {"reason": ""}, format="json")
        blocked = self.client.post(f"/api/patient-portal/appointments/{foreign.id}/cancel/", {"reason": "No podré asistir"}, format="json")
        cancelled = self.client.post(f"/api/patient-portal/appointments/{own.id}/cancel/", {"reason": "No podré asistir"}, format="json")
        self.assertEqual(invalid.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(blocked.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(cancelled.status_code, status.HTTP_200_OK)
        own.refresh_from_db()
        self.assertEqual(own.status, Appointment.Status.CANCELADA)
        self.assertEqual(own.cancellation_reason, "No podré asistir")

    def test_history_prescriptions_and_orders_hide_drafts_and_other_patients(self):
        draft = ClinicalConsultation.objects.create(clinic=self.clinic_a, medical_record=self.record_a, patient=self.patient_a, doctor=self.doctor_a, chief_complaint="Borrador", status=ClinicalConsultation.Status.BORRADOR)
        final = ClinicalConsultation.objects.create(clinic=self.clinic_a, medical_record=self.record_a, patient=self.patient_a, doctor=self.doctor_a, chief_complaint="Final", clinical_assessment="Evaluación final", status=ClinicalConsultation.Status.FINALIZADA)
        foreign_final = ClinicalConsultation.objects.create(clinic=self.clinic_a, medical_record=self.record_a2, patient=self.patient_a2, doctor=self.doctor_a, chief_complaint="Ajena", clinical_assessment="Evaluación ajena", status=ClinicalConsultation.Status.FINALIZADA)
        draft_rx = Prescription.objects.create(clinic=self.clinic_a, patient=self.patient_a, doctor=self.doctor_a, consultation=draft, status=Prescription.Status.BORRADOR)
        visible_rx = Prescription.objects.create(clinic=self.clinic_a, patient=self.patient_a, doctor=self.doctor_a, consultation=final, status=Prescription.Status.EMITIDA)
        Prescription.objects.create(clinic=self.clinic_a, patient=self.patient_a2, doctor=self.doctor_a, consultation=foreign_final, status=Prescription.Status.EMITIDA)
        MedicalOrder.objects.create(clinic=self.clinic_a, patient=self.patient_a, doctor=self.doctor_a, consultation=draft, title="Orden borrador")
        visible_order = MedicalOrder.objects.create(clinic=self.clinic_a, patient=self.patient_a, doctor=self.doctor_a, consultation=final, title="Orden visible")

        history = self.client.get("/api/patient-portal/medical-record-summary/")
        prescriptions = self.client.get("/api/patient-portal/prescriptions/")
        orders = self.client.get("/api/patient-portal/medical-orders/")
        self.assertEqual(history.status_code, status.HTTP_200_OK)
        self.assertEqual([item["chief_complaint"] for item in history.data["consultations"]], ["Final"])
        self.assertEqual([item["id"] for item in prescriptions.data], [visible_rx.id])
        self.assertNotIn(draft_rx.id, [item["id"] for item in prescriptions.data])
        self.assertEqual([item["id"] for item in orders.data], [visible_order.id])
        for internal_field in ["patient", "clinic", "consultation", "issued_by", "allergy_override_reason"]:
            self.assertNotIn(internal_field, prescriptions.data[0])
        for internal_field in ["patient", "clinic", "consultation", "responsible_user", "reviewed_by", "review_notes", "cancelled_by"]:
            self.assertNotIn(internal_field, orders.data[0])

    def test_document_listing_detail_and_download_enforce_patient_and_clinic(self):
        category = DocumentCategory.objects.create(clinic=self.clinic_a, name="Resultados", document_type=DocumentCategory.Type.LAB_RESULT)
        own = ClinicalDocument.objects.create(clinic=self.clinic_a, patient=self.patient_a, category=category, title="Resultado propio", file=SimpleUploadedFile("resultado.pdf", b"%PDF-1.4 test", content_type="application/pdf"), original_filename="resultado.pdf", mime_type="application/pdf", file_extension="pdf", visible_to_patient=True)
        hidden = ClinicalDocument.objects.create(clinic=self.clinic_a, patient=self.patient_a, category=category, title="Oculto", file=SimpleUploadedFile("hidden.pdf", b"hidden", content_type="application/pdf"), original_filename="hidden.pdf", mime_type="application/pdf", file_extension="pdf", visible_to_patient=False)
        foreign = ClinicalDocument.objects.create(clinic=self.clinic_a, patient=self.patient_a2, category=category, title="Ajeno", file=SimpleUploadedFile("foreign.pdf", b"foreign", content_type="application/pdf"), original_filename="foreign.pdf", mime_type="application/pdf", file_extension="pdf", visible_to_patient=True)

        listing = self.client.get("/api/patient-portal/documents/")
        own_detail = self.client.get(f"/api/patient-portal/documents/{own.id}/")
        own_download = self.client.get(f"/api/patient-portal/documents/{own.id}/download/")
        hidden_detail = self.client.get(f"/api/patient-portal/documents/{hidden.id}/")
        foreign_detail = self.client.get(f"/api/patient-portal/documents/{foreign.id}/")
        self.assertEqual([item["id"] for item in listing.data], [own.id])
        self.assertEqual(own_detail.status_code, status.HTTP_200_OK)
        self.assertEqual(own_download.status_code, status.HTTP_200_OK)
        self.assertEqual(hidden_detail.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(foreign_detail.status_code, status.HTTP_404_NOT_FOUND)

    def test_settings_expose_only_patient_relevant_flags(self):
        response = self.client.get("/api/patient-portal/settings/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("allow_in_person_appointments", response.data["portal"])
        self.assertIn("can_view_documents", response.data["permissions"])
        serialized = str(response.data).lower()
        self.assertNotIn("smtp", serialized)
        self.assertNotIn("secret", serialized)
        self.assertNotIn("cai", serialized)

    def create_invoice(self, patient=None, clinic=None, number="FAC-PORTAL-1", **overrides):
        patient = patient or self.patient_a
        clinic = clinic or patient.clinic
        values = {
            "clinic": clinic,
            "patient": patient,
            "invoice_number": number,
            "subtotal": Decimal("100.00"),
            "total_amount": Decimal("100.00"),
            "total": Decimal("100.00"),
            "balance_due": Decimal("100.00"),
            "status": Invoice.Status.PENDIENTE,
        }
        values.update(overrides)
        invoice = Invoice.objects.create(**values)
        InvoiceItem.objects.create(invoice=invoice, description="Consulta", quantity=1, unit_price=100, subtotal=100, line_total=100, total=100)
        return invoice

    def test_financial_portal_hides_internal_fields_and_blocks_foreign_resources(self):
        own = self.create_invoice()
        foreign = self.create_invoice(patient=self.patient_a2, number="FAC-PORTAL-2")
        payment = Payment.objects.create(invoice=own, clinic=self.clinic_a, patient=self.patient_a, amount=Decimal("40.00"), reference="TRANSFER-123456", balance_before=Decimal("100.00"), balance_after=Decimal("60.00"))
        foreign_payment = Payment.objects.create(invoice=foreign, clinic=self.clinic_a, patient=self.patient_a2, amount=Decimal("20.00"), balance_before=Decimal("100.00"), balance_after=Decimal("80.00"))

        invoices = self.client.get("/api/patient-portal/invoices/")
        detail = self.client.get(f"/api/patient-portal/invoices/{own.id}/")
        pdf = self.client.get(f"/api/patient-portal/invoices/{own.id}/pdf/")
        payments = self.client.get("/api/patient-portal/payments/")
        payment_detail = self.client.get(f"/api/patient-portal/payments/{payment.id}/")
        receipt = self.client.get(f"/api/patient-portal/payments/{payment.id}/receipt/")

        self.assertEqual(invoices.status_code, status.HTTP_200_OK)
        self.assertEqual([item["id"] for item in invoices.data], [own.id])
        for field in ["clinic", "patient", "patient_identidad", "appointment", "consultation", "cai"]:
            self.assertNotIn(field, invoices.data[0])
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertNotIn("created_by", detail.data)
        self.assertNotIn("received_by", detail.data["payments"][0])
        self.assertNotIn("cash_session", detail.data["payments"][0])
        self.assertEqual(pdf.status_code, status.HTTP_200_OK)
        self.assertEqual(pdf["Content-Type"], "application/pdf")
        self.assertEqual([item["id"] for item in payments.data], [payment.id])
        self.assertEqual(payment_detail.data["reference_visible"], "****3456")
        self.assertNotIn("received_by", payment_detail.data)
        self.assertNotIn("cash_session", payment_detail.data)
        self.assertEqual(receipt.status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.get(f"/api/patient-portal/invoices/{foreign.id}/").status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.get(f"/api/patient-portal/invoices/{foreign.id}/pdf/").status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.get(f"/api/patient-portal/payments/{foreign_payment.id}/").status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.get(f"/api/patient-portal/payments/{foreign_payment.id}/receipt/").status_code, status.HTTP_404_NOT_FOUND)

    def test_voided_payment_and_credit_note_remain_visible_read_only(self):
        invoice = self.create_invoice(
            number="FAC-FISCAL-1",
        )
        Invoice.objects.filter(id=invoice.id).update(
            is_fiscal=True,
            fiscal_status=Invoice.FiscalStatus.ISSUED,
            fiscal_number="000-001-01-00000001",
            cai="CAI-DEMO",
            fiscal_range_start="000-001-01-00000001",
            fiscal_range_end="000-001-01-00000100",
            fiscal_expiration_date=date.today() + timedelta(days=30),
        )
        invoice.refresh_from_db()
        voided = Payment.objects.create(invoice=invoice, clinic=self.clinic_a, patient=self.patient_a, amount=Decimal("10.00"), status=Payment.Status.ANULADO, active=False, balance_before=100, balance_after=100)
        note = CreditNote.objects.create(
            clinic=self.clinic_a,
            original_invoice=invoice,
            credit_note_number="NC-0001",
            fiscal_number="000-001-02-00000001",
            cai="CAI-DEMO",
            fiscal_range_start="000-001-02-00000001",
            fiscal_range_end="000-001-02-00000100",
            fiscal_expiration_date=date.today() + timedelta(days=30),
            reason="Anulación de prueba",
            total_amount=Decimal("100.00"),
        )
        Invoice.objects.filter(id=invoice.id).update(fiscal_status=Invoice.FiscalStatus.CANCELLED, status=Invoice.Status.ANULADA)

        invoice_detail = self.client.get(f"/api/patient-portal/invoices/{invoice.id}/")
        payment_list = self.client.get("/api/patient-portal/payments/")
        notes = self.client.get("/api/patient-portal/credit-notes/")
        note_pdf = self.client.get(f"/api/patient-portal/credit-notes/{note.id}/pdf/")
        self.assertEqual(invoice_detail.status_code, status.HTTP_200_OK)
        self.assertEqual(invoice_detail.data["related_credit_note"]["id"], note.id)
        self.assertIn(voided.id, [item["id"] for item in payment_list.data])
        self.assertFalse(next(item for item in payment_list.data if item["id"] == voided.id)["receipt_available"])
        self.assertEqual([item["id"] for item in notes.data], [note.id])
        self.assertEqual(note_pdf.status_code, status.HTTP_200_OK)

    def test_patient_notifications_are_clinic_scoped_and_read_actions_are_idempotent(self):
        own = Notification.objects.create(clinic=self.clinic_a, recipient=self.patient_user_a, title="Factura", message="Disponible", related_model="Invoice", related_object_id="123")
        foreign_user = Notification.objects.create(clinic=self.clinic_a, recipient=self.patient_user_a2, title="Ajena", message="No visible")
        wrong_clinic = Notification.objects.create(clinic=self.clinic_b, recipient=self.patient_user_a, title="Otra clínica", message="No visible")
        listing = self.client.get("/api/patient-portal/notifications/")
        self.assertEqual([item["id"] for item in listing.data], [own.id])
        self.assertEqual(listing.data[0]["target"]["type"], "invoice")
        first = self.client.patch(f"/api/patient-portal/notifications/{own.id}/mark-read/")
        second = self.client.patch(f"/api/patient-portal/notifications/{own.id}/mark-read/")
        blocked = self.client.patch(f"/api/patient-portal/notifications/{foreign_user.id}/mark-read/")
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(blocked.status_code, status.HTTP_404_NOT_FOUND)
        self.client.patch("/api/patient-portal/notifications/mark-all-read/")
        wrong_clinic.refresh_from_db()
        self.assertEqual(wrong_clinic.status, Notification.Status.UNREAD)
