from django.core.management.base import BaseCommand

from apps.notifications.generators import generate_appointment_reminders


class Command(BaseCommand):
    help = "Genera recordatorios internos de citas."

    def add_arguments(self, parser):
        parser.add_argument("--hours", type=int, default=24)

    def handle(self, *args, **options):
        created = generate_appointment_reminders(options["hours"])
        self.stdout.write(self.style.SUCCESS(f"Recordatorios creados: {created}"))

