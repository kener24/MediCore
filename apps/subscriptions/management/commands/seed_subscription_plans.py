from django.core.management.base import BaseCommand

from apps.subscriptions.models import SubscriptionPlan
from apps.subscriptions.services import seed_default_subscriptions


PLANS = [
    {
        "name": "Basico",
        "code": "basico",
        "description": "Plan inicial para clinicas pequenas.",
        "price_monthly": "29.00",
        "price_yearly": "299.00",
        "max_users": 5,
        "max_doctors": 2,
        "max_patients": 300,
        "max_appointments_per_month": 200,
        "max_storage_mb": 1000,
        "allow_billing": True,
        "allow_inventory": False,
        "allow_purchases": False,
        "allow_reports": True,
        "allow_audit": False,
        "allow_notifications": True,
        "allow_patient_portal": False,
        "allow_mobile_api": True,
    },
    {
        "name": "Profesional",
        "code": "profesional",
        "description": "Plan completo para clinicas en crecimiento.",
        "price_monthly": "79.00",
        "price_yearly": "799.00",
        "max_users": 20,
        "max_doctors": 10,
        "max_patients": 1500,
        "max_appointments_per_month": 1000,
        "max_storage_mb": 5000,
        "allow_inventory": True,
        "allow_purchases": True,
        "allow_reports": True,
        "allow_audit": True,
        "allow_notifications": True,
        "allow_patient_portal": True,
        "allow_mobile_api": True,
    },
    {
        "name": "Empresarial",
        "code": "empresarial",
        "description": "Plan avanzado con limites altos y todos los modulos.",
        "price_monthly": "199.00",
        "price_yearly": "1990.00",
        "max_users": 100,
        "max_doctors": 50,
        "max_patients": 10000,
        "max_appointments_per_month": 10000,
        "max_storage_mb": 50000,
        "allow_billing": True,
        "allow_inventory": True,
        "allow_purchases": True,
        "allow_reports": True,
        "allow_audit": True,
        "allow_notifications": True,
        "allow_patient_portal": True,
        "allow_mobile_api": True,
        "allow_multi_branch": True,
        "support_level": "enterprise",
    },
]


class Command(BaseCommand):
    help = "Crea planes SaaS base y suscripciones por defecto."

    def handle(self, *args, **options):
        for plan in PLANS:
            SubscriptionPlan.objects.update_or_create(code=plan["code"], defaults=plan)
        seed_default_subscriptions()
        self.stdout.write(self.style.SUCCESS("Planes SaaS y suscripciones por defecto listos."))

