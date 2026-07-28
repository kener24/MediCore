from datetime import timedelta

from django.db.models import F
from django.utils import timezone

from apps.appointments.models import Appointment
from apps.billing.models import CashSession, FiscalDocumentRange, Invoice
from apps.inventory.models import InventoryItem, InventoryLot
from apps.notifications.models import Notification
from apps.notifications.services import create_notification


def recent_notification_exists(recipient, title, related_model, related_object_id, hours=24):
    since = timezone.now() - timedelta(hours=hours)
    return Notification.objects.filter(
        recipient=recipient,
        title=title,
        related_model=related_model,
        related_object_id=str(related_object_id),
        creado_en__gte=since,
    ).exists()


def notify_once(recipients, title, message, related_model, related_object_id, dedupe_hours=24, **kwargs):
    count = 0
    for recipient in recipients:
        if recent_notification_exists(recipient, title, related_model, related_object_id, hours=dedupe_hours):
            continue
        notification = create_notification(recipient, title, message, related_model=related_model, related_object_id=related_object_id, **kwargs)
        count += 1 if notification else 0
    return count


def generate_inventory_alerts():
    count = 0
    today = timezone.localdate()
    for item in InventoryItem.objects.select_related("clinic").filter(active=True, stock_current__lte=F("stock_minimum")):
        admins = item.clinic.usuarios.filter(role__nombre="admin", is_active=True)
        count += notify_once(admins, "Bajo stock", f"{item.name} esta por debajo del stock minimo.", module=Notification.Module.INVENTORY, priority=Notification.Priority.HIGH, notification_type=Notification.Type.ALERT, related_model="InventoryItem", related_object_id=item.id, action_url="/clinic/inventory/alerts", metadata={"item": item.id, "stock_current": str(item.stock_current)})
    for lot in InventoryLot.objects.select_related("clinic", "item").filter(active=True, expiration_date__gte=today, expiration_date__lte=today + timedelta(days=30)):
        admins = lot.clinic.usuarios.filter(role__nombre="admin", is_active=True)
        count += notify_once(admins, "Lote proximo a vencer", f"{lot.item.name} vence el {lot.expiration_date}.", module=Notification.Module.INVENTORY, priority=Notification.Priority.HIGH, notification_type=Notification.Type.WARNING, related_model="InventoryLot", related_object_id=lot.id, action_url="/clinic/inventory/alerts")
    for lot in InventoryLot.objects.select_related("clinic", "item").filter(active=True, expiration_date__lt=today):
        admins = lot.clinic.usuarios.filter(role__nombre="admin", is_active=True)
        count += notify_once(admins, "Lote vencido", f"{lot.item.name} tiene un lote vencido.", module=Notification.Module.INVENTORY, priority=Notification.Priority.URGENT, notification_type=Notification.Type.ERROR, related_model="InventoryLot", related_object_id=lot.id, action_url="/clinic/inventory/alerts")
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
                count += notify_once([user], "Recordatorio de cita", message, clinic=appointment.clinic, notification_type=Notification.Type.REMINDER, module=Notification.Module.APPOINTMENTS, priority=Notification.Priority.NORMAL, related_model="Appointment", related_object_id=appointment.id, action_url=f"/clinic/appointments/{appointment.id}")
    return count


def generate_billing_alerts():
    count = 0
    invoices = Invoice.objects.select_related("clinic", "patient__user").filter(active=True, status__in=[Invoice.Status.PENDIENTE, Invoice.Status.PARCIAL])
    for invoice in invoices:
        if invoice.patient.user:
            count += notify_once([invoice.patient.user], "Factura pendiente", f"Tienes un saldo pendiente de L {invoice.balance_due}.", clinic=invoice.clinic, notification_type=Notification.Type.WARNING, module=Notification.Module.BILLING, priority=Notification.Priority.NORMAL, related_model="Invoice", related_object_id=invoice.id, action_url="/patient/invoices")
        staff = list(invoice.clinic.usuarios.filter(role__nombre__in=["admin", "recepcionista"], is_active=True))
        count += notify_once(staff, "Factura pendiente", f"{invoice.patient.nombre_completo} tiene saldo pendiente.", clinic=invoice.clinic, notification_type=Notification.Type.WARNING, module=Notification.Module.BILLING, priority=Notification.Priority.NORMAL, related_model="Invoice", related_object_id=invoice.id, action_url="/clinic/billing/invoices")
    count += generate_cash_alerts()
    count += generate_fiscal_range_alerts()
    return count


def generate_cash_alerts():
    count = 0
    limit = timezone.now() - timedelta(hours=12)
    sessions = CashSession.objects.select_related("clinic", "opened_by").filter(status=CashSession.Status.ABIERTA, opening_datetime__lte=limit)
    for session in sessions:
        admins = list(session.clinic.usuarios.filter(role__nombre__in=["admin", "recepcionista"], is_active=True))
        count += notify_once(
            admins,
            "Caja abierta sin cierre",
            f"La caja de {session.opened_by.nombre_completo} sigue abierta desde {timezone.localtime(session.opening_datetime).strftime('%Y-%m-%d %H:%M')}.",
            clinic=session.clinic,
            notification_type=Notification.Type.WARNING,
            module=Notification.Module.CASH,
            priority=Notification.Priority.HIGH,
            related_model="CashSession",
            related_object_id=session.id,
            action_url="/clinic/billing/cash",
        )
    return count


def generate_fiscal_range_alerts():
    count = 0
    today = timezone.localdate()
    ranges = FiscalDocumentRange.objects.select_related("clinic").filter(is_active=True, is_exhausted=False)
    for fiscal_range in ranges:
        available = fiscal_range.available_numbers
        expires_soon = fiscal_range.expiration_date <= today + timedelta(days=15)
        low_numbers = available <= 10
        if not expires_soon and not low_numbers:
            continue
        title = "Rango CAI por vencer" if expires_soon else "Rango CAI por agotarse"
        message = f"Rango {fiscal_range.full_start_number} a {fiscal_range.full_end_number}. Disponibles: {available}. Fecha limite: {fiscal_range.expiration_date}."
        admins = list(fiscal_range.clinic.usuarios.filter(role__nombre="admin", is_active=True))
        count += notify_once(
            admins,
            title,
            message,
            clinic=fiscal_range.clinic,
            notification_type=Notification.Type.WARNING,
            module=Notification.Module.BILLING,
            priority=Notification.Priority.HIGH,
            related_model="FiscalDocumentRange",
            related_object_id=fiscal_range.id,
            action_url="/clinic/settings/fiscal-ranges",
        )
    return count
