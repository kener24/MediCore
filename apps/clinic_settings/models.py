import re

from django.core.exceptions import ValidationError
from django.db import models

from apps.core.models import TimeStampedModel


HEX_COLOR = re.compile(r"^#[0-9A-Fa-f]{6}$")


class ClinicSettings(TimeStampedModel):
    clinic = models.OneToOneField("clinics.Clinic", on_delete=models.CASCADE, related_name="settings")
    logo_url = models.URLField(blank=True)
    primary_color = models.CharField(max_length=7, default="#2563EB")
    secondary_color = models.CharField(max_length=7, default="#0F172A")
    accent_color = models.CharField(max_length=7, default="#14B8A6")
    currency = models.CharField(max_length=8, default="HNL")
    country = models.CharField(max_length=80, default="Honduras")
    timezone = models.CharField(max_length=80, default="America/Tegucigalpa")
    language = models.CharField(max_length=10, default="es")
    tax_enabled = models.BooleanField(default=True)
    default_tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    invoice_prefix = models.CharField(max_length=12, default="FAC")
    patient_prefix = models.CharField(max_length=12, default="PAC")
    medical_record_prefix = models.CharField(max_length=12, default="EXP")
    prescription_prefix = models.CharField(max_length=12, default="RX")
    medical_order_prefix = models.CharField(max_length=12, default="OM")
    purchase_order_prefix = models.CharField(max_length=12, default="PO")
    appointment_duration_minutes = models.PositiveIntegerField(default=30)
    allow_online_appointments = models.BooleanField(default=False)
    allow_patient_cancellations = models.BooleanField(default=True)
    cancellation_hours_limit = models.PositiveIntegerField(default=24)
    require_appointment_confirmation = models.BooleanField(default=False)
    allow_patient_portal = models.BooleanField(default=True)
    allow_patient_medical_record_view = models.BooleanField(default=True)
    allow_patient_prescription_view = models.BooleanField(default=True)
    allow_patient_invoice_view = models.BooleanField(default=True)
    business_start_time = models.TimeField(default="08:00")
    business_end_time = models.TimeField(default="17:00")
    working_days = models.JSONField(default=list, blank=True)
    fiscal_name = models.CharField(max_length=180, blank=True)
    fiscal_rtn = models.CharField(max_length=40, blank=True)
    fiscal_address = models.TextField(blank=True)
    fiscal_phone = models.CharField(max_length=40, blank=True)
    fiscal_email = models.EmailField(blank=True)
    footer_invoice_text = models.TextField(blank=True)
    terms_and_conditions = models.TextField(blank=True)
    privacy_policy = models.TextField(blank=True)
    active = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = "Clinic settings"

    def clean(self):
        if self.default_tax_rate < 0:
            raise ValidationError({"default_tax_rate": "La tasa de impuesto no puede ser negativa."})
        if self.appointment_duration_minutes <= 0:
            raise ValidationError({"appointment_duration_minutes": "La duracion debe ser mayor que cero."})
        if self.business_start_time and self.business_end_time and self.business_start_time >= self.business_end_time:
            raise ValidationError({"business_end_time": "La hora final debe ser mayor que la inicial."})
        if not self.currency:
            raise ValidationError({"currency": "La moneda es obligatoria."})
        if not self.timezone:
            raise ValidationError({"timezone": "La zona horaria es obligatoria."})
        for field in ["primary_color", "secondary_color", "accent_color"]:
            value = getattr(self, field)
            if value and not HEX_COLOR.match(value):
                raise ValidationError({field: "Usa formato hexadecimal, por ejemplo #2563EB."})
        if not self.working_days:
            self.working_days = ["lunes", "martes", "miercoles", "jueves", "viernes"]

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"Configuracion {self.clinic}"


class ClinicWorkflowSettings(TimeStampedModel):
    clinic = models.OneToOneField("clinics.Clinic", on_delete=models.CASCADE, related_name="workflow_settings")
    allow_walk_in_patients = models.BooleanField(default=True)
    allow_appointments = models.BooleanField(default=True)
    allow_online_appointments = models.BooleanField(default=False)
    allow_in_person_appointments = models.BooleanField(default=True)
    reception_can_create_minimal_patient = models.BooleanField(default=True)
    reception_handles_cashier = models.BooleanField(default=True)
    walk_in_requires_triage = models.BooleanField(default=True)
    appointment_requires_triage = models.BooleanField(default=False)
    appointment_direct_to_doctor = models.BooleanField(default=True)
    billing_before_consultation = models.BooleanField(default=False)
    billing_after_consultation = models.BooleanField(default=True)
    require_payment_before_consultation = models.BooleanField(default=False)
    allow_consultation_without_payment = models.BooleanField(default=True)
    require_identity_for_patient = models.BooleanField(default=False)
    require_phone_for_patient = models.BooleanField(default=False)
    allow_doctor_to_create_patient = models.BooleanField(default=False)
    allow_nurse_to_edit_patient_basic_data = models.BooleanField(default=False)
    auto_send_to_billing_after_consultation = models.BooleanField(default=True)
    auto_complete_visit_after_payment = models.BooleanField(default=True)
    active = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = "Clinic workflow settings"

    def clean(self):
        if self.billing_before_consultation and self.billing_after_consultation:
            raise ValidationError({"billing_after_consultation": "El cobro no puede ser antes y despues de consulta a la vez."})
        if self.require_payment_before_consultation and self.allow_consultation_without_payment:
            raise ValidationError({"allow_consultation_without_payment": "No se puede requerir pago previo y permitir consulta sin pago."})
        if self.appointment_requires_triage and self.appointment_direct_to_doctor:
            raise ValidationError({"appointment_direct_to_doctor": "Una cita no puede requerir triaje y pasar directo al medico a la vez."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"Flujo clinico {self.clinic}"


def get_or_create_clinic_settings(clinic):
    settings, _ = ClinicSettings.objects.get_or_create(
        clinic=clinic,
        defaults={
            "fiscal_name": getattr(clinic, "nombre", ""),
            "fiscal_phone": getattr(clinic, "telefono", ""),
            "fiscal_email": getattr(clinic, "correo", ""),
            "fiscal_address": getattr(clinic, "direccion", ""),
            "working_days": ["lunes", "martes", "miercoles", "jueves", "viernes"],
        },
    )
    return settings


def get_or_create_workflow_settings(clinic):
    workflow, _ = ClinicWorkflowSettings.objects.get_or_create(
        clinic=clinic,
        defaults={
            "allow_online_appointments": getattr(getattr(clinic, "settings", None), "allow_online_appointments", False),
        },
    )
    return workflow
