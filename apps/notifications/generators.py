from datetime import timedelta

from django.db.models import F
from django.utils import timezone

from apps.appointments.models import Appointment
from apps.billing.models import Invoice
from apps.inventory.models import InventoryItem, InventoryLot
from apps.notifications.models import Notification
from apps.notifications.services import create_notification, notify_clinic_admins, notify_role_users


def generate_inventory_alerts():
    count = 0
    today = timezone.localdate()
    for item in InventoryItem.objects.select_related("clinic").filter(active=True, stock_current__lte=F("stock_minimum")):
        count += len(notify_clinic_admins(item.clinic, "Bajo stock", f"{item.name} esta por debajo del stock minimo.", module=Notification.Module.INVENTORY, priority=Notification.Priority.HIGH, notification_type=Notification.Type.ALERT, related_model="InventoryItem", related_object_id=item.id, action_url="/clinic/inventory/alerts", metadata={"item": item.id, "stock_current": str(item.stock_current)}))
    for lot in InventoryLot.objects.select_related("clinic", "item").filter(active=True, expiration_date__gte=today, expiration_date__lte=today + timedelta(days=30)):
        count += len(notify_clinic_admins(lot.clinic, "Lote proximo a vencer", f"{lot.item.name} vence el {lot.expiration_date}.", module=Notification.Module.INVENTORY, priority=Notification.Priority.HIGH, notification_type=Notification.Type.WARNING, related_model="InventoryLot", related_object_id=lot.id, action_url="/clinic/inventory/alerts"))
    for lot in InventoryLot.objects.select_related("clinic", "item").filter(active=True, expiration_date__lt=today):
        count += len(notify_clinic_admins(lot.clinic, "Lote vencido", f"{lot.item.name} tiene un lote vencido.", module=Notification.Module.INVENTORY, priority=Notification.Priority.URGENT, notification_type=Notification.Type.ERROR, related_model="InventoryLot", related_object_id=lot.id, action_url="/clinic/inventory/alerts"))
    return count


def generate_appointment_reminders(hours=24):
    count = 0
    today = timezone.localdate()
    target = today + timedelta(days=max(1, int(hours) // 24))
    appointments = Appointment.objects.select_related("clinic", "doctor__user", "patient__user").filter(scheduled_date__gte=today, scheduled_date__lte=target, status__in=[Appointment.Status.PENDIENTE, Appointment.Status.CONFIRMADA], activo=True)
    for appointment in appointments:
        message = f"Cita programada el {appointment.scheduled_date} a las {appointment.start_time}."
        for user in [appointment.doctor.user, appointment.patient.user]:
            if user:
                notification = create_notification(user, "Recordatorio de cita", message, clinic=appointment.clinic, notification_type=Notification.Type.REMINDER, module=Notification.Module.APPOINTMENTS, priority=Notification.Priority.NORMAL, related_model="Appointment", related_object_id=appointment.id, action_url=f"/clinic/appointments/{appointment.id}")
                count += 1 if notification else 0
    return count


def generate_billing_alerts():
    count = 0
    invoices = Invoice.objects.select_related("clinic", "patient__user").filter(active=True, status__in=[Invoice.Status.PENDIENTE, Invoice.Status.PARCIAL])
    for invoice in invoices:
        if invoice.patient.user:
            notification = create_notification(invoice.patient.user, "Factura pendiente", f"Tienes un saldo pendiente de L {invoice.balance_due}.", clinic=invoice.clinic, notification_type=Notification.Type.WARNING, module=Notification.Module.BILLING, priority=Notification.Priority.NORMAL, related_model="Invoice", related_object_id=invoice.id, action_url="/patient/invoices")
            count += 1 if notification else 0
        count += len(notify_role_users(invoice.clinic, ["admin", "recepcionista"], "Factura pendiente", f"{invoice.patient.nombre_completo} tiene saldo pendiente.", module=Notification.Module.BILLING, priority=Notification.Priority.NORMAL, notification_type=Notification.Type.WARNING, related_model="Invoice", related_object_id=invoice.id, action_url="/clinic/billing/invoices"))
    return count
