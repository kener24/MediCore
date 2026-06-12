from django.core.management.base import BaseCommand

from apps.clinic_settings.models import get_or_create_clinic_settings
from apps.clinics.models import Clinic


class Command(BaseCommand):
    help = "Crea configuracion por defecto para clinicas sin configuracion."

    def handle(self, *args, **options):
        created = 0
        for clinic in Clinic.objects.all():
            existed = hasattr(clinic, "settings")
            get_or_create_clinic_settings(clinic)
            created += int(not existed)
        self.stdout.write(self.style.SUCCESS(f"Configuraciones creadas: {created}"))
