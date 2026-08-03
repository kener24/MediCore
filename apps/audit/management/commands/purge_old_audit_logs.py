from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.audit.models import AuditLog


class Command(BaseCommand):
    help = "Revisa retencion de auditoria sin borrar registros append-only."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=None, help="Dias de retencion. Si se omite usa AUDIT_RETENTION_DAYS.")
        parser.add_argument("--dry-run", action="store_true", help="Compatibilidad: la revision siempre es no destructiva.")

    def handle(self, *args, **options):
        days = options["days"] or getattr(settings, "AUDIT_RETENTION_DAYS", 365)
        cutoff = timezone.now() - timedelta(days=days)
        queryset = AuditLog.objects.filter(created_at__lt=cutoff)
        count = queryset.count()
        self.stdout.write(
            self.style.WARNING(
                f"Retencion: {count} logs anteriores a {cutoff:%Y-%m-%d %H:%M:%S}. "
                "No se eliminaron porque AuditLog es append-only. Archive externamente segun la politica aprobada."
            )
        )
