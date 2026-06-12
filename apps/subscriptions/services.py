from django.db.models import Count
from django.utils import timezone

from apps.accounts.models import User
from apps.appointments.models import Appointment
from apps.clinics.models import Clinic
from apps.doctors.models import DoctorProfile
from apps.patients.models import Patient
from apps.subscriptions.models import ClinicSubscription, SubscriptionPlan


FEATURE_MAP = {
    "billing": "allow_billing",
    "inventory": "allow_inventory",
    "purchases": "allow_purchases",
    "reports": "allow_reports",
    "audit": "allow_audit",
    "notifications": "allow_notifications",
    "patient_portal": "allow_patient_portal",
    "mobile_api": "allow_mobile_api",
}


def get_default_plan():
    plan = SubscriptionPlan.objects.filter(code="profesional").first() or SubscriptionPlan.objects.filter(active=True).order_by("price_monthly").first()
    if plan:
        return plan
    return SubscriptionPlan.objects.create(
        name="Profesional",
        code="profesional",
        description="Plan profesional por defecto.",
        max_users=20,
        max_doctors=10,
        max_patients=1500,
        max_appointments_per_month=1000,
        max_storage_mb=5000,
        allow_inventory=True,
        allow_purchases=True,
        allow_reports=True,
        allow_audit=True,
        allow_patient_portal=True,
    )


def get_clinic_subscription(clinic):
    if not clinic:
        return None
    subscription, _ = ClinicSubscription.objects.get_or_create(clinic=clinic, defaults={"plan": get_default_plan()})
    return subscription


def is_subscription_active(clinic):
    subscription = get_clinic_subscription(clinic)
    return bool(subscription and subscription.is_active_subscription)


def get_plan_usage(clinic):
    today = timezone.localdate()
    month_start = today.replace(day=1)
    subscription = get_clinic_subscription(clinic)
    plan = subscription.plan if subscription else get_default_plan()
    return {
        "plan": plan.name,
        "plan_code": plan.code,
        "status": subscription.status if subscription else "active",
        "max_users": plan.max_users,
        "users_count": User.objects.filter(clinica=clinic, is_active=True).count(),
        "max_doctors": plan.max_doctors,
        "doctors_count": DoctorProfile.objects.filter(clinic=clinic, activo=True).count(),
        "max_patients": plan.max_patients,
        "patients_count": Patient.objects.filter(clinic=clinic, activo=True).count(),
        "max_appointments_per_month": plan.max_appointments_per_month,
        "appointments_this_month": Appointment.objects.filter(clinic=clinic, scheduled_date__gte=month_start, scheduled_date__lte=today).count(),
        "max_storage_mb": plan.max_storage_mb,
        "storage_used_mb": 0,
    }


def get_features(clinic):
    subscription = get_clinic_subscription(clinic)
    plan = subscription.plan if subscription else get_default_plan()
    return {field: getattr(plan, field) for field in FEATURE_MAP.values()}


def check_feature_enabled(clinic, feature_name):
    if not clinic:
        return True
    subscription = get_clinic_subscription(clinic)
    if not subscription or not subscription.is_active_subscription:
        return False
    field = FEATURE_MAP.get(feature_name, feature_name)
    return bool(getattr(subscription.plan, field, True))


def check_limit(clinic, limit_name):
    usage = get_plan_usage(clinic)
    current = usage.get(f"{limit_name}_count") or usage.get(limit_name)
    maximum = usage.get(f"max_{limit_name}")
    if maximum is None:
        return True
    return int(current or 0) < int(maximum)


def ensure_can_create_user(clinic):
    if not check_limit(clinic, "users"):
        raise ValueError("Tu plan alcanzo el limite de usuarios.")


def ensure_can_create_doctor(clinic):
    if not check_limit(clinic, "doctors"):
        raise ValueError("Tu plan alcanzo el limite de medicos.")


def ensure_can_create_patient(clinic):
    if not check_limit(clinic, "patients"):
        raise ValueError("Tu plan alcanzo el limite de pacientes.")


def ensure_can_create_appointment(clinic):
    usage = get_plan_usage(clinic)
    if usage["appointments_this_month"] >= usage["max_appointments_per_month"]:
        raise ValueError("Tu plan alcanzo el limite mensual de citas.")


def seed_default_subscriptions():
    for clinic in Clinic.objects.all():
        get_clinic_subscription(clinic)

