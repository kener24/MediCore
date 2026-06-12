from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from apps.core.models import TimeStampedModel


class SubscriptionPlan(TimeStampedModel):
    class SupportLevel(models.TextChoices):
        BASIC = "basic", "Basico"
        PRIORITY = "priority", "Prioritario"
        ENTERPRISE = "enterprise", "Empresarial"

    name = models.CharField(max_length=120)
    code = models.SlugField(max_length=60, unique=True)
    description = models.TextField(blank=True)
    price_monthly = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    price_yearly = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    max_users = models.PositiveIntegerField(default=5)
    max_doctors = models.PositiveIntegerField(default=2)
    max_patients = models.PositiveIntegerField(default=300)
    max_appointments_per_month = models.PositiveIntegerField(default=200)
    max_storage_mb = models.PositiveIntegerField(default=1000)
    allow_billing = models.BooleanField(default=True)
    allow_inventory = models.BooleanField(default=False)
    allow_purchases = models.BooleanField(default=False)
    allow_reports = models.BooleanField(default=True)
    allow_audit = models.BooleanField(default=False)
    allow_notifications = models.BooleanField(default=True)
    allow_patient_portal = models.BooleanField(default=False)
    allow_mobile_api = models.BooleanField(default=True)
    allow_multi_branch = models.BooleanField(default=False)
    support_level = models.CharField(max_length=20, choices=SupportLevel.choices, default=SupportLevel.BASIC)
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["price_monthly", "name"]

    def clean(self):
        for field in ["price_monthly", "price_yearly"]:
            if getattr(self, field) < 0:
                raise ValidationError({field: "El precio no puede ser negativo."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class ClinicSubscription(TimeStampedModel):
    class Status(models.TextChoices):
        TRIAL = "trial", "Trial"
        ACTIVE = "active", "Activa"
        PAST_DUE = "past_due", "Pago vencido"
        SUSPENDED = "suspended", "Suspendida"
        CANCELLED = "cancelled", "Cancelada"
        EXPIRED = "expired", "Expirada"

    class BillingCycle(models.TextChoices):
        MONTHLY = "monthly", "Mensual"
        YEARLY = "yearly", "Anual"
        TRIAL = "trial", "Trial"

    clinic = models.OneToOneField("clinics.Clinic", on_delete=models.CASCADE, related_name="subscription")
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT, related_name="clinic_subscriptions")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.TRIAL)
    billing_cycle = models.CharField(max_length=20, choices=BillingCycle.choices, default=BillingCycle.TRIAL)
    start_date = models.DateField(default=timezone.localdate)
    end_date = models.DateField(null=True, blank=True)
    trial_end_date = models.DateField(null=True, blank=True)
    next_payment_date = models.DateField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    suspension_reason = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["clinic__nombre"]

    def clean(self):
        if self.end_date and self.end_date < self.start_date:
            raise ValidationError({"end_date": "La fecha final debe ser posterior al inicio."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.clinic} - {self.plan}"

    @property
    def is_active_subscription(self):
        if self.status not in [self.Status.TRIAL, self.Status.ACTIVE]:
            return False
        if self.end_date and self.end_date < timezone.localdate():
            return False
        return True

