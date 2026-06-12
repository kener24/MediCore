from django.core.management.base import BaseCommand

from apps.accounts.models import User
from apps.notifications.models import Notification
from apps.notifications.services import create_notification


class Command(BaseCommand):
    help = "Crea notificaciones demo para MediCore."

    def handle(self, *args, **options):
        users = User.objects.filter(email__in=["clinicadmin@medicore.com", "doctor@medicore.com", "paciente@medicore.com", "recepcion@medicore.com"], is_active=True)
        created = 0
        for user in users:
            for title, module, priority in [
                ("Bienvenido al centro de notificaciones", Notification.Module.SYSTEM, Notification.Priority.NORMAL),
                ("Recordatorio de cita demo", Notification.Module.APPOINTMENTS, Notification.Priority.HIGH),
                ("Alerta operativa demo", Notification.Module.INVENTORY, Notification.Priority.NORMAL),
            ]:
                if create_notification(user, title, "Notificacion interna de prueba para MediCore.", clinic=user.clinica, notification_type=Notification.Type.INFO, module=module, priority=priority, action_url="/notifications"):
                    created += 1
        self.stdout.write(self.style.SUCCESS(f"Notificaciones demo creadas: {created}"))
