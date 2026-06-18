import logging
from collections.abc import Mapping
from datetime import date, datetime
from decimal import Decimal

from django.forms.models import model_to_dict

from apps.audit.models import AuditLog


logger = logging.getLogger(__name__)

SENSITIVE_KEYS = {
    "password",
    "current_password",
    "old_password",
    "new_password",
    "confirm_password",
    "clave",
    "token",
    "access",
    "refresh",
    "secret",
    "secret_key",
    "authorization",
    "api_key",
    "credit_card",
    "card_number",
    "cvv",
}


def _json_safe(value):
    if isinstance(value, Mapping):
        return {str(key): _json_safe(inner) for key, inner in value.items()}
    if isinstance(value, list):
        return [_json_safe(item) for item in value]
    if isinstance(value, tuple):
        return [_json_safe(item) for item in value]
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    if not isinstance(value, (str, int, float, bool, type(None))):
        return str(value)
    return value


def sanitize_audit_data(data):
    if not data:
        return {}
    if isinstance(data, Mapping):
        cleaned = {}
        for key, value in data.items():
            key_text = str(key).lower()
            if any(sensitive in key_text for sensitive in SENSITIVE_KEYS):
                continue
            cleaned[str(key)] = sanitize_audit_data(value) if isinstance(value, (Mapping, list, tuple)) else _json_safe(value)
        return cleaned
    if isinstance(data, list):
        return [sanitize_audit_data(item) if isinstance(item, Mapping) else _json_safe(item) for item in data]
    if isinstance(data, tuple):
        return [sanitize_audit_data(item) if isinstance(item, Mapping) else _json_safe(item) for item in data]
    return _json_safe(data)


def mask_sensitive(data):
    if not data:
        return {}
    if isinstance(data, Mapping):
        cleaned = {}
        for key, value in data.items():
            key_text = str(key).lower()
            if any(sensitive in key_text for sensitive in SENSITIVE_KEYS):
                cleaned[key] = "********"
            else:
                cleaned[key] = mask_sensitive(value) if isinstance(value, (Mapping, list, tuple)) else _json_safe(value)
        return cleaned
    if isinstance(data, list):
        return [mask_sensitive(item) if isinstance(item, Mapping) else _json_safe(item) for item in data]
    if isinstance(data, tuple):
        return [mask_sensitive(item) if isinstance(item, Mapping) else _json_safe(item) for item in data]
    return _json_safe(data)


def diff_dict(before, after):
    before = sanitize_audit_data(before or {})
    after = sanitize_audit_data(after or {})
    changes = {}
    for field in sorted(set(before.keys()) | set(after.keys())):
        old = before.get(field)
        new = after.get(field)
        if old != new:
            changes[field] = {"old": old, "new": new}
    return changes


def get_client_ip(request):
    if not request:
        return None
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def get_user_role(user):
    return str(getattr(getattr(user, "role", None), "nombre", "") or "")


def get_object_audit_data(obj):
    if not obj:
        return {}
    try:
        return sanitize_audit_data(model_to_dict(obj))
    except Exception:
        return {}


def resolve_clinic(request=None, user=None, clinic=None, obj=None):
    if clinic:
        return clinic
    for source in [obj, user]:
        candidate = getattr(source, "clinic", None) or getattr(source, "clinica", None)
        if candidate:
            return candidate
    if request is not None:
        req_user = getattr(request, "user", None)
        if req_user and getattr(req_user, "is_authenticated", False):
            return getattr(req_user, "clinic", None) or getattr(req_user, "clinica", None)
    return None


def create_audit_log(
    request=None,
    user=None,
    clinic=None,
    action="",
    module="",
    obj=None,
    object_type="",
    object_id="",
    object_repr="",
    description="",
    before_data=None,
    after_data=None,
    changes=None,
    status="success",
    severity="info",
    model_name="",
    old_values=None,
    new_values=None,
    metadata=None,
):
    try:
        if request is not None:
            request_user = getattr(request, "user", None)
            if request_user and getattr(request_user, "is_authenticated", False):
                user = user or request_user

        object_type = object_type or model_name or (obj.__class__.__name__ if obj is not None else "")
        object_id = object_id or (getattr(obj, "pk", "") if obj is not None else "")
        object_repr = object_repr or (str(obj) if obj is not None else "")
        before_raw = before_data if before_data is not None else old_values
        after_raw = after_data if after_data is not None else new_values
        before = sanitize_audit_data(before_raw)
        after = sanitize_audit_data(after_raw)
        safe_metadata = sanitize_audit_data(metadata or {})
        computed_changes = sanitize_audit_data(changes if changes is not None else diff_dict(before, after))
        clinic = resolve_clinic(request=request, user=user, clinic=clinic, obj=obj)

        log = AuditLog.objects.create(
            clinic=clinic,
            user=user,
            user_email=getattr(user, "email", "") if user else "",
            user_role=get_user_role(user),
            action=action or AuditLog.Action.UPDATE,
            module=module or AuditLog.Module.SYSTEM,
            object_type=object_type or "",
            model_name=object_type or "",
            object_id=str(object_id or ""),
            object_repr=str(object_repr or "")[:250],
            description=description or "",
            before_data=before,
            after_data=after,
            changes=computed_changes,
            status=status or AuditLog.Status.SUCCESS,
            severity=severity or AuditLog.Severity.INFO,
            ip_address=get_client_ip(request),
            user_agent=(request.META.get("HTTP_USER_AGENT", "") if request else "")[:1000],
            request_method=(request.method if request else "")[:12],
            request_path=(request.get_full_path() if request else "")[:300],
            old_values=mask_sensitive(before_raw or {}),
            new_values=mask_sensitive(after_raw or {}),
            metadata=mask_sensitive(metadata or {}),
        )
        notify_critical_audit(log)
        return log
    except Exception as exc:
        logger.warning("Audit logging failed: %s", exc)
        return None


def notify_critical_audit(log):
    if log.severity not in [AuditLog.Severity.ERROR, AuditLog.Severity.CRITICAL]:
        return
    try:
        from apps.accounts.models import User
        from apps.notifications.models import Notification
        from apps.notifications.services import create_bulk_notifications, notify_clinic_admins

        title = "Evento critico de auditoria" if log.severity == AuditLog.Severity.CRITICAL else "Evento de auditoria con error"
        message = log.description or f"Evento {log.module}.{log.action}"
        priority = Notification.Priority.URGENT if log.severity == AuditLog.Severity.CRITICAL else Notification.Priority.HIGH
        if log.clinic_id:
            notify_clinic_admins(
                log.clinic,
                title,
                message,
                module=Notification.Module.AUDIT,
                priority=priority,
                notification_type=Notification.Type.ERROR,
                related_model="AuditLog",
                related_object_id=log.id,
                action_url=f"/clinic/audit/logs/{log.id}",
            )
        recipients = User.objects.filter(role__nombre="superadmin", is_active=True)
        create_bulk_notifications(
            recipients,
            title,
            message,
            module=Notification.Module.AUDIT,
            priority=priority,
            notification_type=Notification.Type.ERROR,
            related_model="AuditLog",
            related_object_id=log.id,
            action_url=f"/superadmin/audit/logs/{log.id}",
        )
    except Exception as notify_exc:
        logger.warning("Audit notification failed: %s", notify_exc)


def log_audit_event(**kwargs):
    return create_audit_log(**kwargs)
