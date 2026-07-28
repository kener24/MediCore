from decimal import Decimal
from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.billing.models import BillableService, CashSession, ClinicFiscalProfile, FiscalDocumentRange, Invoice, InvoiceItem, Payment
from apps.clinics.models import Clinic
from apps.inventory.models import InventoryCategory, InventoryItem, InventoryMovement
from apps.medical_records.models import ClinicalSupplyUsage
from apps.patients.models import Patient


class BillingModuleTests(APITestCase):
    def setUp(self):
        self.roles = {name: Role.objects.create(nombre=name) for name in ["admin", "recepcionista", "paciente", "medico", "enfermera"]}
        self.clinic = Clinic.objects.create(nombre="Clinica Demo")
        self.other_clinic = Clinic.objects.create(nombre="Otra")
        self.admin = User.objects.create_user(email="admin@x.com", password="x", role=self.roles["admin"], clinica=self.clinic)
        self.rec = User.objects.create_user(email="rec@x.com", password="x", role=self.roles["recepcionista"], clinica=self.clinic)
        self.doctor_user = User.objects.create_user(email="doc@x.com", password="x", role=self.roles["medico"], clinica=self.clinic)
        self.patient_user = User.objects.create_user(email="pat@x.com", password="x", role=self.roles["paciente"], clinica=self.clinic)
        self.other_patient_user = User.objects.create_user(email="pat2@x.com", password="x", role=self.roles["paciente"], clinica=self.other_clinic)
        self.patient = Patient.objects.create(clinic=self.clinic, user=self.patient_user, nombres="Juan", apellidos="Perez")
        self.other_patient = Patient.objects.create(clinic=self.other_clinic, user=self.other_patient_user, nombres="Ana", apellidos="Lopez")
        self.category = InventoryCategory.objects.create(clinic=self.clinic, name="Medicamentos")
        self.item = InventoryItem.objects.create(clinic=self.clinic, category=self.category, name="Suero intravenoso", item_type=InventoryItem.Type.MEDICAMENTO, cost_price=Decimal("80.00"), sale_price=Decimal("250.00"), stock_current=Decimal("5.00"))

    def auth(self, user):
        self.client.force_authenticate(user=user)

    def invoice(self):
        inv = Invoice.objects.create(patient=self.patient, created_by=self.admin)
        InvoiceItem.objects.create(invoice=inv, description="Consulta", quantity=1, unit_price=Decimal("500.00"))
        return inv

    def fiscal_profile(self):
        return ClinicFiscalProfile.objects.create(
            clinic=self.clinic,
            legal_name="Clinica Demo SA",
            commercial_name="Clinica Demo",
            rtn="08011999123456",
            address="Barrio Centro",
            is_fiscal_billing_enabled=True,
        )

    def fiscal_range(self, start=1, end=10, current=1, expiration=None, document_type=FiscalDocumentRange.DocumentType.INVOICE, document_type_code="01"):
        return FiscalDocumentRange.objects.create(
            clinic=self.clinic,
            document_type=document_type,
            cai="DEMO-CAI-NO-VALIDO",
            establishment_code="000",
            emission_point_code="001",
            document_type_code=document_type_code,
            start_number=start,
            end_number=end,
            current_number=current,
            start_date=(expiration - timedelta(days=30)) if expiration else timezone.localdate(),
            expiration_date=expiration or timezone.localdate() + timedelta(days=30),
            is_active=True,
        )

    def credit_note_range(self, start=1, end=10, current=1, expiration=None):
        return self.fiscal_range(start=start, end=end, current=current, expiration=expiration, document_type=FiscalDocumentRange.DocumentType.CREDIT_NOTE, document_type_code="04")

    def other_invoice(self):
        inv = Invoice.objects.create(patient=self.other_patient)
        InvoiceItem.objects.create(invoice=inv, description="Consulta", quantity=1, unit_price=Decimal("300.00"))
        return inv

    def test_admin_crea_servicio(self):
        self.auth(self.admin)
        res = self.client.post("/api/billing/services/", {"name": "Consulta", "price": "500.00"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_no_facturar_otra_clinica(self):
        self.auth(self.rec)
        res = self.client.post("/api/billing/invoices/", {"patient": self.other_patient.id}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_no_consulta_factura_de_otra_clinica(self):
        invoice = Invoice.objects.create(clinic=self.other_clinic, patient=self.other_patient)
        self.auth(self.admin)
        response = self.client.get(f"/api/billing/invoices/{invoice.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_factura_calcula_total(self):
        inv = self.invoice()
        self.assertEqual(inv.total_amount, Decimal("500.00"))

    def test_crear_factura_con_items_anidados(self):
        self.auth(self.admin)
        service = BillableService.objects.create(clinic=self.clinic, name="Consulta", price=Decimal("500.00"), taxable=True, tax_rate=Decimal("15.00"))
        res = self.client.post(
            "/api/billing/invoices/",
            {
                "patient": self.patient.id,
                "notes": "Factura de consulta",
                "items": [
                    {
                        "service": service.id,
                        "description": "Consulta medica general",
                        "quantity": "2",
                        "unit_price": "500.00",
                        "discount_amount": "100.00",
                        "tax_rate": "15.00",
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(res.data["subtotal"]), Decimal("1000.00"))
        self.assertEqual(Decimal(res.data["discount_amount"]), Decimal("100.00"))
        self.assertEqual(Decimal(res.data["tax_amount"]), Decimal("135.00"))
        self.assertEqual(Decimal(res.data["total_amount"]), Decimal("1035.00"))

    def test_create_invoice_devuelve_id(self):
        self.auth(self.rec)
        res = self.client.post(
            "/api/billing/invoices/",
            {"patient": self.patient.id, "items": [{"description": "Consulta", "quantity": "1", "unit_price": "100.00"}]},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn("id", res.data)

    def test_listado_today_filtra_solo_hoy(self):
        today = timezone.localdate()
        old_day = today - timedelta(days=3)
        current = self.invoice()
        old = Invoice.objects.create(patient=self.patient, created_by=self.admin, issue_date=old_day)
        InvoiceItem.objects.create(invoice=old, description="Antigua", quantity=1, unit_price=Decimal("100.00"))
        self.auth(self.rec)
        res = self.client.get("/api/billing/invoices/?today=true")
        ids = {item["id"] for item in res.data}
        self.assertIn(current.id, ids)
        self.assertNotIn(old.id, ids)

    def test_listado_date_from_date_to_filtra(self):
        today = timezone.localdate()
        old_day = today - timedelta(days=10)
        current = self.invoice()
        old = Invoice.objects.create(patient=self.patient, created_by=self.admin, issue_date=old_day)
        InvoiceItem.objects.create(invoice=old, description="Antigua", quantity=1, unit_price=Decimal("100.00"))
        self.auth(self.rec)
        res = self.client.get(f"/api/billing/invoices/?date_from={today}&date_to={today}")
        ids = {item["id"] for item in res.data}
        self.assertIn(current.id, ids)
        self.assertNotIn(old.id, ids)

    def test_today_summary_calcula_totales(self):
        inv = self.invoice()
        Payment.objects.create(invoice=inv, amount=Decimal("200.00"), received_by=self.rec)
        self.auth(self.rec)
        res = self.client.get("/api/billing/invoices/today-summary/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["total_invoices"], 1)
        self.assertEqual(Decimal(res.data["total_invoiced"]), Decimal("500.00"))
        self.assertEqual(Decimal(res.data["total_paid"]), Decimal("200.00"))
        self.assertEqual(Decimal(res.data["total_balance"]), Decimal("300.00"))

    def test_invoice_payments_endpoint(self):
        inv = self.invoice()
        Payment.objects.create(invoice=inv, amount=Decimal("200.00"), received_by=self.rec)
        self.auth(self.rec)
        res = self.client.get(f"/api/billing/invoices/{inv.id}/payments/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)

    def test_consumo_clinico_descuenta_stock_y_crea_movimiento(self):
        self.auth(self.admin)
        res = self.client.post("/api/clinical-consumptions/", {"patient": self.patient.id, "inventory_item": self.item.id, "quantity": "2.00", "usage_type": "serum", "billable": True}, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.item.refresh_from_db()
        self.assertEqual(self.item.stock_current, Decimal("3.00"))
        self.assertTrue(InventoryMovement.objects.filter(item=self.item, movement_type=InventoryMovement.Type.SALIDA, reason="clinical_consumption").exists())

    def test_consumo_sin_stock_no_permitido(self):
        self.auth(self.admin)
        res = self.client.post("/api/clinical-consumptions/", {"patient": self.patient.id, "inventory_item": self.item.id, "quantity": "20.00", "usage_type": "serum", "billable": True}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_consumo_facturable_aparece_pendiente_y_se_agrega_a_factura_sin_doble_descuento(self):
        self.auth(self.admin)
        usage_res = self.client.post("/api/clinical-consumptions/", {"patient": self.patient.id, "inventory_item": self.item.id, "quantity": "1.00", "usage_type": "serum", "billable": True}, format="json")
        self.assertEqual(usage_res.status_code, status.HTTP_201_CREATED)
        self.item.refresh_from_db()
        stock_after_usage = self.item.stock_current
        pending = self.client.get(f"/api/billing/pending-consumptions/?patient={self.patient.id}")
        self.assertEqual(len(pending.data), 1)
        inv = Invoice.objects.create(patient=self.patient, created_by=self.admin)
        add = self.client.post(f"/api/billing/invoices/{inv.id}/add-consumption/", {"consumption_id": usage_res.data["id"]}, format="json")
        self.assertEqual(add.status_code, status.HTTP_201_CREATED)
        self.item.refresh_from_db()
        self.assertEqual(self.item.stock_current, stock_after_usage)
        usage = ClinicalSupplyUsage.objects.get(id=usage_res.data["id"])
        self.assertTrue(usage.invoiced)
        inv.refresh_from_db()
        self.assertEqual(inv.total_amount, Decimal("250.00"))
        again = self.client.post(f"/api/billing/invoices/{inv.id}/add-consumption/", {"consumption_id": usage.id}, format="json")
        self.assertEqual(again.status_code, status.HTTP_400_BAD_REQUEST)

    def test_producto_directo_en_factura_descuenta_stock(self):
        self.auth(self.admin)
        inv = Invoice.objects.create(patient=self.patient, created_by=self.admin)
        res = self.client.post(f"/api/billing/invoices/{inv.id}/add-inventory-item/", {"inventory_item": self.item.id, "quantity": "1.00"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.item.refresh_from_db()
        inv.refresh_from_db()
        self.assertEqual(self.item.stock_current, Decimal("4.00"))
        self.assertEqual(inv.total_amount, Decimal("250.00"))

    def test_pago_parcial_y_completo(self):
        inv = self.invoice()
        Payment.objects.create(invoice=inv, amount=Decimal("200.00"), received_by=self.rec)
        inv.refresh_from_db()
        self.assertEqual(inv.status, Invoice.Status.PARCIAL)
        Payment.objects.create(invoice=inv, amount=Decimal("300.00"), received_by=self.rec)
        inv.refresh_from_db()
        self.assertEqual(inv.status, Invoice.Status.PAGADA)

    def test_no_pagar_anulada(self):
        inv = self.invoice()
        inv.status = Invoice.Status.ANULADA
        inv.save(update_fields=["status"])
        self.auth(self.rec)
        res = self.client.post("/api/billing/payments/", {"invoice": inv.id, "amount": "10.00"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_no_pagar_mas_del_saldo(self):
        inv = self.invoice()
        self.auth(self.rec)
        res = self.client.post("/api/billing/payments/", {"invoice": inv.id, "amount": "600.00"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_anular_pago_recalcula(self):
        inv = self.invoice()
        pay = Payment.objects.create(invoice=inv, amount=Decimal("200.00"), received_by=self.rec)
        self.auth(self.rec)
        self.client.patch(f"/api/billing/payments/{pay.id}/void/", {"reason": "error"}, format="json")
        inv.refresh_from_db()
        self.assertEqual(inv.paid_amount, Decimal("0.00"))

    def test_paciente_ve_solo_suyas(self):
        self.invoice()
        Invoice.objects.create(patient=self.other_patient)
        self.auth(self.patient_user)
        res = self.client.get("/api/billing/invoices/my-invoices/")
        self.assertEqual(len(res.data), 1)

    def test_print_data_respeta_permisos_de_paciente(self):
        inv = self.invoice()
        other = Invoice.objects.create(patient=self.other_patient)
        self.auth(self.patient_user)
        own = self.client.get(f"/api/billing/invoices/{inv.id}/print-data/")
        self.assertEqual(own.status_code, status.HTTP_200_OK)
        self.assertEqual(own.data["invoice"]["number"], inv.invoice_number)
        foreign = self.client.get(f"/api/billing/invoices/{other.id}/print-data/")
        self.assertEqual(foreign.status_code, status.HTTP_404_NOT_FOUND)

    def test_paciente_no_anula_factura(self):
        inv = self.invoice()
        self.auth(self.patient_user)
        res = self.client.patch(f"/api/billing/invoices/{inv.id}/void/", {"reason": "x"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_emitir_factura_fiscal_asigna_cai_y_correlativo(self):
        self.fiscal_profile()
        fiscal_range = self.fiscal_range()
        inv = self.invoice()
        self.auth(self.rec)
        res = self.client.post(f"/api/billing/invoices/{inv.id}/issue-fiscal/", {}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["fiscal_number"], "000-001-01-00000001")
        self.assertEqual(res.data["cai"], fiscal_range.cai)
        inv.refresh_from_db()
        fiscal_range.refresh_from_db()
        self.assertTrue(inv.is_fiscal)
        self.assertEqual(inv.fiscal_status, Invoice.FiscalStatus.ISSUED)
        self.assertEqual(fiscal_range.current_number, 2)

    def test_no_emitir_factura_fiscal_dos_veces(self):
        self.fiscal_profile()
        self.fiscal_range()
        inv = self.invoice()
        self.auth(self.rec)
        self.assertEqual(self.client.post(f"/api/billing/invoices/{inv.id}/issue-fiscal/", {}, format="json").status_code, status.HTTP_200_OK)
        again = self.client.post(f"/api/billing/invoices/{inv.id}/issue-fiscal/", {}, format="json")
        self.assertEqual(again.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(again.data["detail"], "La factura fiscal ya fue emitida.")

    def test_fiscal_readiness_reporta_estado_por_clinica(self):
        self.auth(self.rec)
        missing = self.client.get("/api/billing/fiscal-readiness/")
        self.assertEqual(missing.status_code, status.HTTP_200_OK)
        self.assertFalse(missing.data["ready"])
        self.assertEqual(missing.data["status"], "missing_profile")

        self.fiscal_profile()
        no_range = self.client.get("/api/billing/fiscal-readiness/")
        self.assertEqual(no_range.status_code, status.HTTP_200_OK)
        self.assertFalse(no_range.data["ready"])
        self.assertEqual(no_range.data["status"], "missing_range")

        self.fiscal_range()
        ready = self.client.get("/api/billing/fiscal-readiness/")
        self.assertEqual(ready.status_code, status.HTTP_200_OK)
        self.assertTrue(ready.data["ready"])
        self.assertEqual(ready.data["status"], "ready")
        self.assertEqual(ready.data["active_range"]["full_start_number"], "000-001-01-00000001")

    def test_no_emitir_factura_fiscal_de_otra_clinica(self):
        self.fiscal_profile()
        self.fiscal_range()
        inv = self.other_invoice()
        self.auth(self.rec)
        res = self.client.post(f"/api/billing/invoices/{inv.id}/issue-fiscal/", {}, format="json")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_pdf_fiscal_requiere_emision_y_respeta_clinica(self):
        self.fiscal_profile()
        self.fiscal_range()
        inv = self.invoice()
        self.auth(self.rec)
        draft_pdf = self.client.get(f"/api/billing/invoices/{inv.id}/fiscal-pdf/")
        self.assertEqual(draft_pdf.status_code, status.HTTP_400_BAD_REQUEST)

        self.client.post(f"/api/billing/invoices/{inv.id}/issue-fiscal/", {}, format="json")
        issued_pdf = self.client.get(f"/api/billing/invoices/{inv.id}/fiscal-pdf/")
        self.assertEqual(issued_pdf.status_code, status.HTTP_200_OK)
        self.assertEqual(issued_pdf["Content-Type"], "application/pdf")

        foreign = self.other_invoice()
        foreign_pdf = self.client.get(f"/api/billing/invoices/{foreign.id}/fiscal-pdf/")
        self.assertEqual(foreign_pdf.status_code, status.HTTP_404_NOT_FOUND)

    def test_factura_fiscal_emitida_no_se_edita_ni_borra(self):
        self.fiscal_profile()
        self.fiscal_range()
        inv = self.invoice()
        self.auth(self.rec)
        self.client.post(f"/api/billing/invoices/{inv.id}/issue-fiscal/", {}, format="json")
        patch = self.client.patch(f"/api/billing/invoices/{inv.id}/", {"notes": "x"}, format="json")
        delete = self.client.delete(f"/api/billing/invoices/{inv.id}/", format="json")
        item = inv.items.first()
        item_patch = self.client.patch(f"/api/billing/invoices/{inv.id}/items/{item.id}/", {"description": "Nueva"}, format="json")
        self.assertEqual(patch.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(delete.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(item_patch.status_code, status.HTTP_400_BAD_REQUEST)

    def test_no_emitir_sin_perfil_o_con_rango_vencido_o_agotado(self):
        inv = self.invoice()
        self.auth(self.rec)
        res = self.client.post(f"/api/billing/invoices/{inv.id}/issue-fiscal/", {}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.fiscal_profile()
        self.fiscal_range(expiration=timezone.localdate() - timedelta(days=1))
        res = self.client.post(f"/api/billing/invoices/{inv.id}/issue-fiscal/", {}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        FiscalDocumentRange.objects.all().delete()
        self.fiscal_range(start=1, end=1, current=1)
        one = self.client.post(f"/api/billing/invoices/{inv.id}/issue-fiscal/", {}, format="json")
        self.assertEqual(one.status_code, status.HTTP_200_OK)
        second = self.invoice()
        exhausted = self.client.post(f"/api/billing/invoices/{second.id}/issue-fiscal/", {}, format="json")
        self.assertEqual(exhausted.status_code, status.HTTP_400_BAD_REQUEST)

    def test_anular_factura_fiscal_no_reutiliza_numero(self):
        self.fiscal_profile()
        self.fiscal_range()
        self.credit_note_range()
        inv = self.invoice()
        self.auth(self.rec)
        self.client.post(f"/api/billing/invoices/{inv.id}/issue-fiscal/", {}, format="json")
        cancel = self.client.post(f"/api/billing/invoices/{inv.id}/cancel-fiscal/", {"reason": "Error en cliente"}, format="json")
        self.assertEqual(cancel.status_code, status.HTTP_200_OK)
        new_inv = self.invoice()
        issue = self.client.post(f"/api/billing/invoices/{new_inv.id}/issue-fiscal/", {}, format="json")
        self.assertEqual(issue.data["fiscal_number"], "000-001-01-00000002")

    def test_void_fiscal_genera_nota_credito_y_mantiene_factura_original(self):
        self.fiscal_profile()
        invoice_range = self.fiscal_range()
        credit_range = self.credit_note_range()
        inv = self.invoice()
        self.auth(self.rec)
        self.client.post(f"/api/billing/invoices/{inv.id}/issue-fiscal/", {}, format="json")
        inv.refresh_from_db()
        original_number = inv.fiscal_number
        original_cai = inv.cai
        res = self.client.post(f"/api/billing/invoices/{inv.id}/void-fiscal/", {"reason": "Error en datos del cliente"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["credit_note_number"], "000-001-04-00000001")
        inv.refresh_from_db()
        invoice_range.refresh_from_db()
        credit_range.refresh_from_db()
        note = inv.credit_notes.get()
        self.assertEqual(inv.fiscal_status, Invoice.FiscalStatus.CANCELLED)
        self.assertEqual(inv.fiscal_number, original_number)
        self.assertEqual(inv.cai, original_cai)
        self.assertEqual(note.fiscal_number, "000-001-04-00000001")
        self.assertEqual(note.total_amount, inv.total_amount)
        self.assertEqual(invoice_range.current_number, 2)
        self.assertEqual(credit_range.current_number, 2)

    def test_void_fiscal_valida_motivo_estado_permiso_y_rango_credito(self):
        self.fiscal_profile()
        self.fiscal_range()
        inv = self.invoice()
        self.auth(self.rec)
        non_fiscal = self.client.post(f"/api/billing/invoices/{inv.id}/void-fiscal/", {"reason": "x"}, format="json")
        self.assertEqual(non_fiscal.status_code, status.HTTP_400_BAD_REQUEST)
        self.client.post(f"/api/billing/invoices/{inv.id}/issue-fiscal/", {}, format="json")
        no_reason = self.client.post(f"/api/billing/invoices/{inv.id}/void-fiscal/", {"reason": ""}, format="json")
        self.assertEqual(no_reason.status_code, status.HTTP_400_BAD_REQUEST)
        no_range = self.client.post(f"/api/billing/invoices/{inv.id}/void-fiscal/", {"reason": "Error"}, format="json")
        self.assertEqual(no_range.status_code, status.HTTP_400_BAD_REQUEST)
        self.credit_note_range(expiration=timezone.localdate() - timedelta(days=1))
        expired = self.client.post(f"/api/billing/invoices/{inv.id}/void-fiscal/", {"reason": "Error"}, format="json")
        self.assertEqual(expired.status_code, status.HTTP_400_BAD_REQUEST)
        FiscalDocumentRange.objects.filter(document_type=FiscalDocumentRange.DocumentType.CREDIT_NOTE).delete()
        self.credit_note_range(start=1, end=1, current=1)
        ok = self.client.post(f"/api/billing/invoices/{inv.id}/void-fiscal/", {"reason": "Error"}, format="json")
        self.assertEqual(ok.status_code, status.HTTP_200_OK)
        again = self.client.post(f"/api/billing/invoices/{inv.id}/void-fiscal/", {"reason": "Otra"}, format="json")
        self.assertEqual(again.status_code, status.HTTP_400_BAD_REQUEST)

        second = self.invoice()
        self.client.post(f"/api/billing/invoices/{second.id}/issue-fiscal/", {}, format="json")
        exhausted = self.client.post(f"/api/billing/invoices/{second.id}/void-fiscal/", {"reason": "Error"}, format="json")
        self.assertEqual(exhausted.status_code, status.HTTP_400_BAD_REQUEST)

        self.auth(self.doctor_user)
        denied = self.client.post(f"/api/billing/invoices/{second.id}/void-fiscal/", {"reason": "Error"}, format="json")
        self.assertEqual(denied.status_code, status.HTTP_403_FORBIDDEN)

    def test_void_fiscal_no_cruza_clinicas_y_no_borra_pagos(self):
        self.fiscal_profile()
        self.fiscal_range()
        self.credit_note_range()
        inv = self.invoice()
        Payment.objects.create(invoice=inv, amount=Decimal("100.00"), received_by=self.rec)
        self.auth(self.rec)
        self.client.post(f"/api/billing/invoices/{inv.id}/issue-fiscal/", {}, format="json")
        res = self.client.post(f"/api/billing/invoices/{inv.id}/void-fiscal/", {"reason": "Error"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("payment_warning", res.data)
        self.assertEqual(inv.payments.filter(active=True).count(), 1)

        other = self.other_invoice()
        foreign = self.client.post(f"/api/billing/invoices/{other.id}/void-fiscal/", {"reason": "Error"}, format="json")
        self.assertEqual(foreign.status_code, status.HTTP_404_NOT_FOUND)

    def test_credit_note_listado_y_pdf_respetan_clinica(self):
        self.fiscal_profile()
        self.fiscal_range()
        self.credit_note_range()
        inv = self.invoice()
        self.auth(self.rec)
        self.client.post(f"/api/billing/invoices/{inv.id}/issue-fiscal/", {}, format="json")
        response = self.client.post(f"/api/billing/invoices/{inv.id}/void-fiscal/", {"reason": "Error"}, format="json")
        note_id = response.data["credit_note_id"]
        listing = self.client.get("/api/billing/credit-notes/")
        self.assertEqual(listing.status_code, status.HTTP_200_OK)
        self.assertEqual(len(listing.data), 1)
        pdf = self.client.get(f"/api/billing/credit-notes/{note_id}/pdf/")
        self.assertEqual(pdf.status_code, status.HTTP_200_OK)
        self.assertEqual(pdf["Content-Type"], "application/pdf")

        other_note_pdf = self.client.get("/api/billing/credit-notes/9999/pdf/")
        self.assertEqual(other_note_pdf.status_code, status.HTTP_404_NOT_FOUND)

    def test_caja_abrir_doble_y_cerrar(self):
        self.auth(self.rec)
        res = self.client.post("/api/billing/cash-sessions/open/", {"opening_amount": "100.00"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        res2 = self.client.post("/api/billing/cash-sessions/open/", {"opening_amount": "50.00"}, format="json")
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        close = self.client.patch(f"/api/billing/cash-sessions/{res.data['id']}/close/", {"closing_amount": "100.00"}, format="json")
        self.assertEqual(close.status_code, status.HTTP_200_OK)

    def test_no_movimiento_caja_cerrada(self):
        session = CashSession.objects.create(clinic=self.clinic, opened_by=self.rec, opening_amount=Decimal("0.00"))
        session.close(self.rec, Decimal("0.00"))
        self.auth(self.rec)
        res = self.client.post(f"/api/billing/cash-sessions/{session.id}/movements/", {"movement_type": "ingreso", "amount": "10.00", "reason": "x"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_pago_efectivo_requiere_caja_abierta(self):
        inv = self.invoice()
        self.auth(self.rec)
        res = self.client.post("/api/billing/payments/", {"invoice": inv.id, "amount": "100.00", "method": "efectivo"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cash_session", res.data)

    def test_pago_movil_cash_adjunta_caja_abierta(self):
        inv = self.invoice()
        session = CashSession.objects.create(clinic=self.clinic, opened_by=self.rec, opening_amount=Decimal("50.00"))
        self.auth(self.rec)
        res = self.client.post(f"/api/billing/invoices/{inv.id}/payments/", {"amount": "100.00", "method": "cash"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        payment = Payment.objects.get(id=res.data["id"])
        self.assertEqual(payment.method, Payment.Method.EFECTIVO)
        self.assertEqual(payment.cash_session_id, session.id)

    def test_pago_tarjeta_acepta_alias_movil_sin_caja(self):
        inv = self.invoice()
        self.auth(self.rec)
        res = self.client.post("/api/billing/payments/", {"invoice": inv.id, "amount": "100.00", "method": "card", "reference": "AUTH-1"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["method"], Payment.Method.TARJETA)

    def test_pago_no_efectivo_requiere_referencia(self):
        inv = self.invoice()
        self.auth(self.rec)
        res = self.client.post("/api/billing/payments/", {"invoice": inv.id, "amount": "100.00", "method": "tarjeta"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("reference", res.data)

    def test_cierre_con_diferencia_requiere_nota(self):
        session = CashSession.objects.create(clinic=self.clinic, opened_by=self.rec, opening_amount=Decimal("100.00"))
        self.auth(self.rec)
        res = self.client.patch(f"/api/billing/cash-sessions/{session.id}/close/", {"closing_amount": "90.00"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("notes", res.data)
        ok = self.client.patch(f"/api/billing/cash-sessions/{session.id}/close/", {"closing_amount": "90.00", "notes": "Faltante en arqueo"}, format="json")
        self.assertEqual(ok.status_code, status.HTTP_200_OK)

    def test_no_anular_pago_de_caja_cerrada(self):
        inv = self.invoice()
        session = CashSession.objects.create(clinic=self.clinic, opened_by=self.rec, opening_amount=Decimal("0.00"))
        self.auth(self.rec)
        payment_res = self.client.post("/api/billing/payments/", {"invoice": inv.id, "amount": "100.00", "method": "efectivo"}, format="json")
        self.assertEqual(payment_res.status_code, status.HTTP_201_CREATED)
        session.refresh_from_db()
        session.close(self.rec, Decimal("100.00"))
        void = self.client.patch(f"/api/billing/payments/{payment_res.data['id']}/void/", {"reason": "Error"}, format="json")
        self.assertEqual(void.status_code, status.HTTP_400_BAD_REQUEST)

    def test_resumen_caja_diario(self):
        inv = self.invoice()
        CashSession.objects.create(clinic=self.clinic, opened_by=self.rec, opening_amount=Decimal("25.00"))
        self.auth(self.rec)
        self.client.post("/api/billing/payments/", {"invoice": inv.id, "amount": "100.00", "method": "efectivo"}, format="json")
        res = self.client.get("/api/billing/cash-sessions/summary/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["open_sessions"], 1)
        self.assertEqual(res.data["cash_payments"], Decimal("100.00"))

    def test_sin_auth(self):
        res = self.client.get("/api/billing/invoices/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
