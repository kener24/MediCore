from django.core.management.base import BaseCommand

from apps.notifications.generators import generate_billing_alerts


class Command(BaseCommand):
    help = "Genera alertas internas de facturacion."

    def handle(self, *args, **options):
        created = generate_billing_alerts()
        self.stdout.write(self.style.SUCCESS(f"Alertas de facturacion creadas: {created}"))

