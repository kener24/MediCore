from django.core.management.base import BaseCommand

from apps.notifications.generators import generate_appointment_reminders, generate_billing_alerts, generate_inventory_alerts


class Command(BaseCommand):
    help = "Genera recordatorios y alertas operativas pendientes."

    def add_arguments(self, parser):
        parser.add_argument("--hours", type=int, default=24, help="Ventana de recordatorios de citas.")

    def handle(self, *args, **options):
        results = {
            "appointments": generate_appointment_reminders(hours=options["hours"]),
            "billing_cash_fiscal": generate_billing_alerts(),
            "inventory": generate_inventory_alerts(),
        }
        self.stdout.write(self.style.SUCCESS(
            "Notificaciones generadas: " + ", ".join(f"{key}={value}" for key, value in results.items())
        ))
