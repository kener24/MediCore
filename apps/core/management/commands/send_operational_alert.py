import re
import time
from pathlib import Path

from django.conf import settings
from django.core.mail import send_mail
from django.core.management.base import BaseCommand, CommandError


SAFE_SOURCE = re.compile(r"^[A-Za-z0-9_.@-]{1,120}$")


class Command(BaseCommand):
    help = "Send a throttled, non-clinical operational alert."

    def add_arguments(self, parser):
        parser.add_argument("--source", default="medicore-monitor")
        parser.add_argument("--state-file", default="/var/lib/medicore/last-operational-alert")
        parser.add_argument("--minimum-interval", type=int, default=3600)
        parser.add_argument("--force", action="store_true")

    def handle(self, *args, **options):
        recipient = str(getattr(settings, "OPERATIONS_ALERT_EMAIL", "") or "").strip()
        if not recipient:
            self.stdout.write("Operational alert skipped: recipient is not configured.")
            return
        source = str(options["source"]).strip()
        if not SAFE_SOURCE.fullmatch(source):
            raise CommandError("The alert source is invalid.")

        state_file = Path(options["state_file"])
        now = int(time.time())
        if not options["force"]:
            try:
                last_sent = int(state_file.read_text(encoding="ascii").strip())
            except (OSError, ValueError):
                last_sent = 0
            if now - last_sent < max(options["minimum_interval"], 60):
                self.stdout.write("Operational alert throttled.")
                return

        send_mail(
            subject="[MediCore] Alerta operativa",
            message=(
                "MediCore detectó un fallo en una verificación operativa.\n"
                f"Origen: {source}\n"
                "Revisa el estado de API, base de datos, disco, servicios y respaldos.\n"
                "Este mensaje no contiene información clínica."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient],
            fail_silently=False,
        )
        state_file.parent.mkdir(parents=True, exist_ok=True)
        state_file.write_text(str(now), encoding="ascii")
        state_file.chmod(0o600)
        self.stdout.write(self.style.SUCCESS("Operational alert sent."))
