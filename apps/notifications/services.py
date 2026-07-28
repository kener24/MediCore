import logging
import json
from collections.abc import Mapping
from datetime import date, datetime
from decimal import Decimal
from urllib import request as urlrequest
from urllib.error import URLError

from django.conf import settings
from django.utils import timezone

from apps.accounts.models import User
from apps.notifications.email_service import send_notification_email
from apps.notifications.models import Notification, NotificationPreference, PushDevice


logger = logging.getLogger(__name__)
SENSITIVE_KEYS = ["password", "clave", "token", "access", "refresh", "secret", "api_key", "authorization", "credit_card", "card_number", "cvv"]
MODULE_PREFS = {
    "appointments": "receive_appointment_reminders",
    "billing": "receive_billing_alerts",
    "payments": "receive_billing_alerts",
    "cash": "receive_billing_alerts",
    "inventory": "receive_inventory_alerts",
    "purchases": "receive_purchase_alerts",
    "audit": "receive_audit_alerts",
    "system": "receive_system_notifications",
}
EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def clean_metadata(value):
    if isinstance(value, Mapping):
        cleaned = {}
        for key, inner in value.items():
            if any(sensitive in str(key).lower() for sensitive in SENSITIVE_KEYS):
                cleaned[key] = "********"
            else:
                cleaned[key] = clean_metadata(inner)
        return cleaned
    if isinstance(value, list):
        return [clean_metadata(item) for item in value]
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    if not isinstance(value, (str, int, float, bool, type(None))):
        return str(value)
    return value


def get_preferences(user):
    preferences, _ = NotificationPreference.objects.get_or_create(user=user)
    return preferences


def preference_allows(user, module):
    preferences = get_preferences(user)
    field = MODULE_PREFS.get(module, "receive_system_notifications")
    return bool(getattr(preferences, field, True))


def create_notification(
    recipient,
    title,
    message,
    clinic=None,
    notification_type="info",
    module="system",
    priority="normal",
    related_model=None,
    related_object_id=None,
    action_url=None,
    metadata=None,
    expires_at=None,
    force_email=False,
):
    try:
        if not recipient or not recipient.is_active:
            return None
        if not force_email and not preference_allows(recipient, module):
            return None
        notification = Notification.objects.create(
            clinic=clinic or getattr(recipient, "clinica", None),
            recipient=recipient,
            title=title,
            message=message,
            notification_type=notification_type,
            module=module,
            priority=priority,
            related_model=related_model or "",
            related_object_id=str(related_object_id or ""),
            action_url=action_url or "",
            metadata=clean_metadata(metadata or {}),
            expires_at=expires_at,
        )
        send_push_for_notification(notification)
        send_notification_email(notification, force=force_email)
        return notification
    except Exception as exc:
        logger.warning("Notification failed: %s", exc)
        return None


def push_enabled():
    return bool(getattr(settings, "EXPO_PUSH_ENABLED", True))


def push_priority(priority):
    return "high" if priority in [Notification.Priority.HIGH, Notification.Priority.URGENT] else "default"


def send_push_for_notification(notification):
    if not push_enabled():
        return 0
    preferences = get_preferences(notification.recipient)
    if not preferences.push_enabled:
        return 0
    devices = PushDevice.objects.filter(user=notification.recipient, is_active=True)
    sent = 0
    for device in devices:
        payload = {
            "to": device.expo_push_token,
            "title": notification.title,
            "body": notification.message,
            "sound": "default",
            "priority": push_priority(notification.priority),
            "data": {
                "notificationId": notification.id,
                "module": notification.module,
                "actionUrl": notification.action_url,
                "relatedModel": notification.related_model,
                "relatedObjectId": notification.related_object_id,
            },
        }
        try:
            request = urlrequest.Request(
                EXPO_PUSH_URL,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json", "Accept": "application/json"},
                method="POST",
            )
            with urlrequest.urlopen(request, timeout=4) as response:
                if 200 <= response.status < 300:
                    sent += 1
        except URLError as exc:
            logger.info("Expo push not delivered for device %s: %s", device.id, exc)
        except Exception as exc:
            logger.warning("Expo push failed for device %s: %s", device.id, exc)
    if sent:
        notification.sent_at = timezone.now()
        notification.save(update_fields=["sent_at", "actualizado_en"])
    return sent


def create_bulk_notifications(recipients, title, message, **kwargs):
    notifications = []
    for recipient in recipients:
        notification = create_notification(recipient, title, message, **kwargs)
        if notification:
            notifications.append(notification)
    return notifications


def notify_clinic_admins(clinic, title, message, module="system", priority="normal", metadata=None, **kwargs):
    recipients = User.objects.filter(clinica=clinic, role__nombre="admin", is_active=True)
    return create_bulk_notifications(recipients, title, message, clinic=clinic, module=module, priority=priority, metadata=metadata, **kwargs)


def notify_role_users(clinic, role_names, title, message, module="system", priority="normal", metadata=None, **kwargs):
    recipients = User.objects.filter(clinica=clinic, role__nombre__in=role_names, is_active=True)
    return create_bulk_notifications(recipients, title, message, clinic=clinic, module=module, priority=priority, metadata=metadata, **kwargs)
