from decimal import Decimal

from django.core.management.base import BaseCommand

from apps.accounts.models import User
from apps.billing.models import BillableService, CashSession, Invoice, InvoiceItem, Payment
from apps.clinics.models import Clinic
from apps.patients.models import Patient


class Command(BaseCommand):
    help = "Crea servicios, facturas, pagos y caja demo."

    def handle(self, *args, **options):
        clinic = Clinic.objects.filter(correo="demo@medicore.com").first() or Clinic.objects.first()
        patient = Patient.objects.filter(clinic=clinic).first()
        user = User.objects.filter(email="clinicadmin@medicore.com").first() or User.objects.filter(clinica=clinic).first()
        if not clinic or not patient or not user:
            self.stderr.write("Faltan clinica, paciente o usuario demo.")
            return
        services = [
            ("CONS-GEN", "Consulta medica general", Decimal("500.00")),
            ("CONS-ESP", "Consulta especialista", Decimal("800.00")),
            ("CTRL", "Control medico", Decimal("350.00")),
            ("CERT", "Certificado medico", Decimal("250.00")),
            ("PROC-MEN", "Procedimiento menor", Decimal("1000.00")),
            ("EX-BAS", "Examen basico", Decimal("300.00")),
        ]
        for code, name, price in services:
            BillableService.objects.update_or_create(clinic=clinic, code=code, defaults={"name": name, "price": price, "taxable": False})
        invoice, _ = Invoice.objects.update_or_create(patient=patient, invoice_number="FAC-DEMO-001", defaults={"clinic": clinic, "created_by": user, "notes": "Factura demo"})
        service = BillableService.objects.filter(clinic=clinic, code="CONS-GEN").first()
        InvoiceItem.objects.update_or_create(invoice=invoice, service=service, defaults={"description": service.name, "quantity": 1, "unit_price": service.price})
        session = CashSession.objects.filter(clinic=clinic, opened_by=user, status=CashSession.Status.ABIERTA).first()
        if not session:
            session = CashSession.objects.create(clinic=clinic, opened_by=user, opening_amount=Decimal("1000.00"), notes="Caja demo")
        if invoice.balance_due > 0:
            Payment.objects.create(invoice=invoice, amount=min(invoice.balance_due, Decimal("250.00")), method=Payment.Method.EFECTIVO, cash_session=session, received_by=user)
        self.stdout.write(self.style.SUCCESS("Facturacion demo creada o actualizada."))
