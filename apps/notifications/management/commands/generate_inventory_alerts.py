from django.core.management.base import BaseCommand

from apps.notifications.generators import generate_inventory_alerts


class Command(BaseCommand):
    help = "Genera alertas internas de inventario."

    def handle(self, *args, **options):
        created = generate_inventory_alerts()
        self.stdout.write(self.style.SUCCESS(f"Alertas de inventario creadas: {created}"))

