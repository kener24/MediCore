from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.notifications.email_service import send_delivery_test


class Command(BaseCommand):
    help = "Envía un correo de prueba y valida la configuración de entrega."

    def add_arguments(self, parser):
        parser.add_argument("--to", required=True, help="Correo que recibirá la prueba.")

    def handle(self, *args, **options):
        backend = settings.EMAIL_BACKEND
        self.stdout.write(f"Backend: {backend}")
        self.stdout.write(f"Host: {settings.EMAIL_HOST or '(sin configurar)'}:{settings.EMAIL_PORT}")
        self.stdout.write(f"Remitente: {settings.DEFAULT_FROM_EMAIL}")
        if backend == "django.core.mail.backends.smtp.EmailBackend":
            missing = [name for name, value in {
                "EMAIL_HOST": settings.EMAIL_HOST,
                "EMAIL_HOST_USER": settings.EMAIL_HOST_USER,
                "EMAIL_HOST_PASSWORD": settings.EMAIL_HOST_PASSWORD,
            }.items() if not value]
            if missing:
                raise CommandError(f"Faltan variables SMTP: {', '.join(missing)}")
        if not send_delivery_test(options["to"]):
            raise CommandError("El servidor de correo no confirmó la entrega del mensaje.")
        self.stdout.write(self.style.SUCCESS("Correo de prueba enviado correctamente."))
