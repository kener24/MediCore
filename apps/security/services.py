import hashlib
import re
import secrets

from django.conf import settings
from django.contrib.auth import password_validation
from django.core.mail import send_mail
from django.utils import timezone

from apps.audit.models import AuditLog
from apps.audit.services import log_audit_event
from apps.notifications.models import Notification
from apps.notifications.services import create_notification
from apps.security.models import AccountLock, EmailVerificationToken, LoginAttempt, PasswordResetToken, SecuritySetting, UserSession


def get_client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR") if request else None
    return forwarded.split(",")[0].strip() if forwarded else (request.META.get("REMOTE_ADDR") if request else None)


def get_user_agent(request):
    return (request.META.get("HTTP_USER_AGENT", "") if request else "")[:1000]


def generate_secure_token():
    return secrets.token_urlsafe(48)


def hash_token(token):
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def get_security_settings(clinic=None):
    if clinic:
        setting = SecuritySetting.objects.filter(clinic=clinic, active=True).first()
        if setting:
            return setting
    setting, _ = SecuritySetting.objects.get_or_create(
        clinic=None,
        active=True,
        defaults={
            "password_min_length": 8,
            "max_failed_login_attempts": settings.MAX_FAILED_LOGIN_ATTEMPTS,
            "lockout_minutes": settings.ACCOUNT_LOCKOUT_MINUTES,
            "password_reset_token_minutes": settings.PASSWORD_RESET_TOKEN_MINUTES,
            "email_verification_token_minutes": settings.EMAIL_VERIFICATION_TOKEN_MINUTES,
            "session_lifetime_minutes": settings.SESSION_LIFETIME_MINUTES,
        },
    )
    return setting


def password_policy_dict(clinic=None):
    setting = get_security_settings(clinic)
    return {
        "min_length": setting.password_min_length,
        "require_uppercase": setting.password_require_uppercase,
        "require_lowercase": setting.password_require_lowercase,
        "require_number": setting.password_require_number,
        "require_symbol": setting.password_require_symbol,
    }


def validate_password_policy(password, user=None, clinic=None):
    policy = password_policy_dict(clinic or getattr(user, "clinica", None))
    errors = []
    if len(password or "") < policy["min_length"]:
        errors.append(f"La contrasena debe tener al menos {policy['min_length']} caracteres.")
    if policy["require_uppercase"] and not re.search(r"[A-Z]", password or ""):
        errors.append("La contrasena debe incluir una mayuscula.")
    if policy["require_lowercase"] and not re.search(r"[a-z]", password or ""):
        errors.append("La contrasena debe incluir una minuscula.")
    if policy["require_number"] and not re.search(r"\d", password or ""):
        errors.append("La contrasena debe incluir un numero.")
    if policy["require_symbol"] and not re.search(r"[^A-Za-z0-9]", password or ""):
        errors.append("La contrasena debe incluir un simbolo.")
    try:
        password_validation.validate_password(password, user)
    except Exception as exc:
        errors.extend(getattr(exc, "messages", [str(exc)]))
    return {"valid": not errors, "errors": errors, "policy": policy}


def create_password_reset_token(user, request=None):
    PasswordResetToken.objects.filter(user=user, used_at__isnull=True).update(used_at=timezone.now())
    token = generate_secure_token()
    expires = timezone.now() + timezone.timedelta(minutes=get_security_settings(user.clinica).password_reset_token_minutes)
    PasswordResetToken.objects.create(user=user, token_hash=hash_token(token), expires_at=expires, ip_address=get_client_ip(request), user_agent=get_user_agent(request))
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    send_mail("Recupera tu contrasena en MediCore", f"Usa este enlace para restablecer tu contrasena: {reset_url}", settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=True)
    log_audit_event(request=request, user=user, clinic=user.clinica, action=AuditLog.Action.PASSWORD_RESET, module=AuditLog.Module.AUTH, model_name="User", object_id=user.id, object_repr=user.email, description="Solicitud de recuperacion de contrasena.")
    create_notification(user, "Recuperacion de contrasena solicitada", "Se solicito recuperar tu contrasena.", clinic=user.clinica, module=Notification.Module.AUTH, notification_type=Notification.Type.INFO)
    return token, reset_url


def confirm_password_reset(token, new_password, request=None):
    token_hash = hash_token(token)
    reset = PasswordResetToken.objects.select_related("user", "user__clinica").filter(token_hash=token_hash).first()
    if not reset or reset.used_at:
        raise ValueError("Token invalido o usado.")
    if reset.expires_at < timezone.now():
        raise ValueError("Token expirado.")
    result = validate_password_policy(new_password, reset.user)
    if not result["valid"]:
        raise ValueError(" ".join(result["errors"]))
    user = reset.user
    user.set_password(new_password)
    user.password_changed_at = timezone.now()
    user.save(update_fields=["password", "password_changed_at"])
    reset.used_at = timezone.now()
    reset.save(update_fields=["used_at"])
    revoke_all_user_sessions(user)
    log_audit_event(request=request, user=user, clinic=user.clinica, action=AuditLog.Action.PASSWORD_RESET, module=AuditLog.Module.AUTH, model_name="User", object_id=user.id, object_repr=user.email, description="Recuperacion de contrasena completada.")
    create_notification(user, "Contrasena actualizada", "Tu contrasena fue actualizada correctamente.", clinic=user.clinica, module=Notification.Module.AUTH, notification_type=Notification.Type.SUCCESS)
    return user


def create_email_verification_token(user, request=None):
    EmailVerificationToken.objects.filter(user=user, used_at__isnull=True).update(used_at=timezone.now())
    token = generate_secure_token()
    expires = timezone.now() + timezone.timedelta(minutes=get_security_settings(user.clinica).email_verification_token_minutes)
    EmailVerificationToken.objects.create(user=user, token_hash=hash_token(token), expires_at=expires)
    url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    send_mail("Verifica tu correo en MediCore", f"Usa este enlace para verificar tu correo: {url}", settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=True)
    log_audit_event(request=request, user=user, clinic=user.clinica, action=AuditLog.Action.UPDATE, module=AuditLog.Module.AUTH, model_name="User", object_id=user.id, object_repr=user.email, description="Token de verificacion de correo enviado.")
    return token, url


def confirm_email_verification(token, request=None):
    verification = EmailVerificationToken.objects.select_related("user", "user__clinica").filter(token_hash=hash_token(token)).first()
    if not verification or verification.used_at:
        raise ValueError("Token invalido o usado.")
    if verification.expires_at < timezone.now():
        raise ValueError("Token expirado.")
    user = verification.user
    user.email_verified = True
    user.save(update_fields=["email_verified"])
    verification.used_at = timezone.now()
    verification.save(update_fields=["used_at"])
    log_audit_event(request=request, user=user, clinic=user.clinica, action=AuditLog.Action.UPDATE, module=AuditLog.Module.AUTH, model_name="User", object_id=user.id, object_repr=user.email, description="Correo verificado.")
    create_notification(user, "Correo verificado", "Tu correo fue verificado correctamente.", clinic=user.clinica, module=Notification.Module.AUTH, notification_type=Notification.Type.SUCCESS)
    return user


def active_lock(user):
    lock = AccountLock.objects.filter(user=user, active=True).order_by("-created_at").first()
    if lock and lock.locked_until <= timezone.now():
        lock.active = False
        lock.unlocked_at = timezone.now()
        lock.save(update_fields=["active", "unlocked_at"])
        return None
    return lock


def record_login_attempt(email, request, success, user=None, failure_reason=""):
    return LoginAttempt.objects.create(email=email or "", user=user, success=success, failure_reason=failure_reason, ip_address=get_client_ip(request), user_agent=get_user_agent(request))


def register_failed_login(user, request):
    if not user:
        return None
    setting = get_security_settings(user.clinica)
    since = timezone.now() - timezone.timedelta(minutes=setting.lockout_minutes)
    failed_count = LoginAttempt.objects.filter(user=user, success=False, created_at__gte=since).count()
    if failed_count >= setting.max_failed_login_attempts:
        lock, _ = AccountLock.objects.update_or_create(
            user=user,
            active=True,
            defaults={
                "locked_until": timezone.now() + timezone.timedelta(minutes=setting.lockout_minutes),
                "reason": "Demasiados intentos fallidos de login.",
                "failed_attempts": failed_count,
            },
        )
        log_audit_event(request=request, user=user, clinic=user.clinica, action=AuditLog.Action.PERMISSION_DENIED, module=AuditLog.Module.AUTH, model_name="AccountLock", object_id=lock.id, object_repr=user.email, description="Cuenta bloqueada por intentos fallidos.", severity=AuditLog.Severity.WARNING)
        create_notification(user, "Cuenta bloqueada", "Tu cuenta fue bloqueada temporalmente por intentos fallidos.", clinic=user.clinica, module=Notification.Module.AUTH, notification_type=Notification.Type.WARNING, priority=Notification.Priority.HIGH)
        return lock
    return None


def device_name_from_user_agent(user_agent):
    ua = user_agent or ""
    if "Firefox" in ua:
        browser = "Firefox"
    elif "Edg" in ua:
        browser = "Edge"
    elif "Chrome" in ua:
        browser = "Chrome"
    elif "Safari" in ua:
        browser = "Safari"
    else:
        browser = "Dispositivo"
    if "Windows" in ua:
        os_name = "Windows"
    elif "Android" in ua:
        os_name = "Android"
    elif "iPhone" in ua or "iPad" in ua:
        os_name = "iOS"
    elif "Mac" in ua:
        os_name = "Mac"
    else:
        os_name = "desconocido"
    return f"{browser} {os_name}"


def create_user_session(user, request, refresh_token=None):
    now = timezone.now()
    token_hash = hash_token(str(refresh_token)) if refresh_token else ""
    session = UserSession.objects.create(
        user=user,
        session_key=secrets.token_hex(24),
        refresh_token_hash=token_hash,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        device_name=device_name_from_user_agent(get_user_agent(request)),
        last_activity_at=now,
        expires_at=now + timezone.timedelta(minutes=get_security_settings(user.clinica).session_lifetime_minutes),
    )
    user.ultimo_acceso = now
    user.last_login_ip = session.ip_address
    user.last_login_user_agent = session.user_agent
    user.save(update_fields=["ultimo_acceso", "last_login_ip", "last_login_user_agent"])
    create_notification(user, "Nuevo inicio de sesion", f"Se inicio sesion desde {session.device_name}.", clinic=user.clinica, module=Notification.Module.AUTH, notification_type=Notification.Type.INFO)
    return session


def revoke_user_session(session, revoked_by=None):
    session.active = False
    session.revoked_at = timezone.now()
    session.revoked_by = revoked_by
    session.save(update_fields=["active", "revoked_at", "revoked_by"])
    return session


def revoke_all_user_sessions(user, keep_current=None, revoked_by=None):
    qs = UserSession.objects.filter(user=user, active=True)
    if keep_current:
        qs = qs.exclude(session_key=keep_current)
    now = timezone.now()
    qs.update(active=False, revoked_at=now, revoked_by=revoked_by)
    return True
