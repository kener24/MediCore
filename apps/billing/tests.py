from decimal import Decimal
from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.billing.models import BillableService, CashSession, Invoice, InvoiceItem, Payment
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

    def test_admin_crea_servicio(self):
        self.auth(self.admin)
        res = self.client.post("/api/billing/services/", {"name": "Consulta", "price": "500.00"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_no_facturar_otra_clinica(self):
        self.auth(self.rec)
        res = self.client.post("/api/billing/invoices/", {"patient": self.other_patient.id}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_factura_calcula_total(self):
        inv = self.invoice()
        self.assertEqual(inv.total_amount, Decimal("500.00"))

    def test_crear_factura_con_items_anidados(self):
        self.auth(self.rec)
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

    def test_sin_auth(self):
        res = self.client.get("/api/billing/invoices/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
