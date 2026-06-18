from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.billing.models import ClinicFiscalProfile, FiscalDocumentRange
from apps.clinics.models import Clinic


class Command(BaseCommand):
    help = "Crea perfil fiscal y rango CAI demo. No usar en produccion."

    def handle(self, *args, **options):
        clinic = Clinic.objects.filter(nombre__icontains="Demo").first() or Clinic.objects.first()
        if not clinic:
            self.stdout.write(self.style.ERROR("No hay clinicas para crear datos fiscales demo."))
            return
        profile, _ = ClinicFiscalProfile.objects.update_or_create(
            clinic=clinic,
            defaults={
                "legal_name": f"{clinic.nombre} DEMO - NO VALIDO",
                "commercial_name": clinic.nombre,
                "rtn": "08011999123456",
                "address": getattr(clinic, "direccion", "") or "Direccion demo",
                "municipality": "Distrito Central",
                "department": "Francisco Morazan",
                "phone": getattr(clinic, "telefono", "") or "0000-0000",
                "email": getattr(clinic, "correo", "") or "demo@medicore.local",
                "economic_activity": "Servicios medicos demo",
                "is_fiscal_billing_enabled": True,
                "default_isv_rate": "15.00",
                "secondary_isv_rate": "18.00",
                "fiscal_legend": "CAI DEMO NO VALIDO LEGALMENTE. No usar en produccion.",
            },
        )
        FiscalDocumentRange.objects.filter(clinic=clinic, document_type=FiscalDocumentRange.DocumentType.INVOICE, is_active=True).update(is_active=False)
        fiscal_range = FiscalDocumentRange.objects.create(
            clinic=clinic,
            document_type=FiscalDocumentRange.DocumentType.INVOICE,
            cai="DEMO-CAI-NO-VALIDO-LEGALMENTE",
            establishment_code="000",
            emission_point_code="001",
            document_type_code="01",
            start_number=1,
            end_number=100,
            current_number=1,
            start_date=timezone.localdate(),
            expiration_date=timezone.localdate() + timedelta(days=365),
            is_active=True,
        )
        self.stdout.write(self.style.SUCCESS(f"Perfil fiscal demo creado para {clinic.nombre}: {profile.rtn}"))
        self.stdout.write(self.style.WARNING(f"Rango CAI demo {fiscal_range.full_start_number} a {fiscal_range.full_end_number}. NO ES VALIDO LEGALMENTE."))
