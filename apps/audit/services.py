import logging
from datetime import date, datetime
from decimal import Decimal
from collections.abc import Mapping

from apps.audit.models import AuditLog


logger = logging.getLogger(__name__)

SENSITIVE_KEYS = ["password", "clave", "token", "access", "refresh", "secret", "api_key", "authorization", "credit_card", "card_number", "cvv"]


def mask_sensitive(value):
    if isinstance(value, Mapping):
        cleaned = {}
        for key, inner in value.items():
            if any(sensitive in str(key).lower() for sensitive in SENSITIVE_KEYS):
                cleaned[key] = "********"
            else:
                cleaned[key] = mask_sensitive(inner)
        return cleaned
    if isinstance(value, list):
        return [mask_sensitive(item) for item in value]
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    if not isinstance(value, (str, int, float, bool, type(None))):
        return str(value)
    return value


def get_client_ip(request):
    if not request:
        return None
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def log_audit_event(
    request=None,
    user=None,
    clinic=None,
    action="",
    module="",
    model_name="",
    object_id=None,
    object_repr="",
    description="",
    severity="info",
    old_values=None,
    new_values=None,
    metadata=None,
):
    try:
        if request is not None:
            user = user or (request.user if getattr(request, "user", None) and request.user.is_authenticated else None)
            clinic = clinic or getattr(user, "clinica", None)
        log = AuditLog.objects.create(
            clinic=clinic,
            user=user,
            action=action,
            module=module,
            model_name=model_name or "",
            object_id=str(object_id or ""),
            object_repr=str(object_repr or "")[:250],
            description=description or "",
            severity=severity or AuditLog.Severity.INFO,
            ip_address=get_client_ip(request),
            user_agent=(request.META.get("HTTP_USER_AGENT", "") if request else "")[:1000],
            request_method=(request.method if request else ""),
            request_path=(request.get_full_path() if request else "")[:300],
            old_values=mask_sensitive(old_values or {}),
            new_values=mask_sensitive(new_values or {}),
            metadata=mask_sensitive(metadata or {}),
        )
        if log.severity in [AuditLog.Severity.ERROR, AuditLog.Severity.CRITICAL]:
            try:
                from apps.accounts.models import User
                from apps.notifications.models import Notification
                from apps.notifications.services import create_bulk_notifications, notify_clinic_admins

                title = "Evento critico de auditoria" if log.severity == AuditLog.Severity.CRITICAL else "Evento de auditoria con error"
                message = log.description or f"Evento {log.module}.{log.action}"
                if log.clinic_id:
                    notify_clinic_admins(log.clinic, title, message, module=Notification.Module.AUDIT, priority=Notification.Priority.URGENT if log.severity == AuditLog.Severity.CRITICAL else Notification.Priority.HIGH, notification_type=Notification.Type.ERROR, related_model="AuditLog", related_object_id=log.id, action_url=f"/clinic/audit/logs/{log.id}")
                recipients = User.objects.filter(role__nombre="superadmin", is_active=True)
                create_bulk_notifications(recipients, title, message, module=Notification.Module.AUDIT, priority=Notification.Priority.URGENT if log.severity == AuditLog.Severity.CRITICAL else Notification.Priority.HIGH, notification_type=Notification.Type.ERROR, related_model="AuditLog", related_object_id=log.id, action_url=f"/superadmin/audit/logs/{log.id}")
            except Exception as notify_exc:
                logger.warning("Audit notification failed: %s", notify_exc)
        return log
    except Exception as exc:
        logger.warning("Audit logging failed: %s", exc)
        return None
