from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.audit.models import AuditLog


class Command(BaseCommand):
    help = "Elimina logs de auditoria antiguos segun AUDIT_RETENTION_DAYS."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=None, help="Dias de retencion. Si se omite usa AUDIT_RETENTION_DAYS.")
        parser.add_argument("--dry-run", action="store_true", help="Solo muestra cuantos logs se eliminarian.")

    def handle(self, *args, **options):
        days = options["days"] or getattr(settings, "AUDIT_RETENTION_DAYS", 365)
        cutoff = timezone.now() - timedelta(days=days)
        queryset = AuditLog.objects.filter(created_at__lt=cutoff)
        count = queryset.count()
        if options["dry_run"]:
            self.stdout.write(self.style.WARNING(f"Dry-run: se eliminarian {count} logs anteriores a {cutoff:%Y-%m-%d %H:%M:%S}."))
            return
        queryset.delete()
        self.stdout.write(self.style.SUCCESS(f"Logs de auditoria eliminados: {count}."))
