import logging
from urllib.parse import urljoin

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone

from apps.notifications.models import NotificationPreference


logger = logging.getLogger(__name__)
NON_DELIVERY_BACKENDS = {
    "django.core.mail.backends.console.EmailBackend",
    "django.core.mail.backends.dummy.EmailBackend",
}


def _recipient_name(user):
    return (getattr(user, "nombre_completo", "") or "Usuario MediCore").strip()


def _absolute_action_url(action_url):
    path = str(action_url or "").strip()
    if not path:
        return settings.FRONTEND_URL
    if path.startswith("/"):
        return urljoin(f"{settings.FRONTEND_URL.rstrip('/')}/", path.lstrip("/"))
    if path.startswith(f"{settings.FRONTEND_URL.rstrip('/')}/"):
        return path
    return settings.FRONTEND_URL


def send_templated_email(*, subject, recipient_email, template_name, context=None):
    recipient = str(recipient_email or "").strip()
    if not recipient:
        return False
    if not settings.DEBUG and settings.EMAIL_BACKEND in NON_DELIVERY_BACKENDS:
        logger.error("Email delivery is disabled because a non-delivery backend is configured.")
        return False

    payload = {
        "app_name": "MediCore",
        "frontend_url": settings.FRONTEND_URL,
        "support_email": settings.EMAIL_REPLY_TO or settings.DEFAULT_FROM_EMAIL,
        **(context or {}),
    }
    text_body = render_to_string(f"emails/{template_name}.txt", payload)
    html_body = render_to_string(f"emails/{template_name}.html", payload)
    reply_to = [settings.EMAIL_REPLY_TO] if settings.EMAIL_REPLY_TO else None
    message = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[recipient],
        reply_to=reply_to,
    )
    message.attach_alternative(html_body, "text/html")
    try:
        return message.send(fail_silently=False) == 1
    except Exception:
        logger.exception("Email delivery failed using template %s.", template_name)
        return False


def send_password_reset_email(user, reset_url, expires_minutes):
    return send_templated_email(
        subject="Restablece tu contraseña de MediCore",
        recipient_email=user.email,
        template_name="password_reset",
        context={
            "recipient_name": _recipient_name(user),
            "reset_url": reset_url,
            "expires_minutes": expires_minutes,
        },
    )


def send_email_verification(user, verification_url, expires_minutes):
    return send_templated_email(
        subject="Verifica tu correo en MediCore",
        recipient_email=user.email,
        template_name="email_verification",
        context={
            "recipient_name": _recipient_name(user),
            "verification_url": verification_url,
            "expires_minutes": expires_minutes,
        },
    )


def send_notification_email(notification, *, force=False):
    if not force and not settings.EMAIL_NOTIFICATIONS_ENABLED:
        return False
    if not force:
        preferences, _ = NotificationPreference.objects.get_or_create(user=notification.recipient)
        if not preferences.email_enabled:
            return False
        if notification.module not in settings.EMAIL_NOTIFICATION_MODULES:
            return False

    sent = send_templated_email(
        subject=f"{notification.title} | MediCore",
        recipient_email=notification.recipient.email,
        template_name="notification",
        context={
            "recipient_name": _recipient_name(notification.recipient),
            "title": notification.title,
            "message": notification.message,
            "priority": notification.get_priority_display(),
            "action_url": _absolute_action_url(notification.action_url),
        },
    )
    if sent and not notification.sent_at:
        notification.sent_at = timezone.now()
        notification.save(update_fields=["sent_at", "actualizado_en"])
    return sent


def send_delivery_test(recipient_email):
    return send_templated_email(
        subject="Prueba de correo de MediCore",
        recipient_email=recipient_email,
        template_name="notification",
        context={
            "recipient_name": "Equipo MediCore",
            "title": "Configuración de correo verificada",
            "message": "El servidor pudo entregar correctamente este mensaje de prueba.",
            "priority": "Prueba",
            "action_url": settings.FRONTEND_URL,
        },
    )
