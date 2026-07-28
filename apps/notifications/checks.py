from django.conf import settings
from django.core.checks import Error, Warning, register


SMTP_BACKEND = "django.core.mail.backends.smtp.EmailBackend"


@register()
def email_configuration_check(app_configs, **kwargs):
    messages = []
    if settings.EMAIL_USE_TLS and settings.EMAIL_USE_SSL:
        messages.append(Error(
            "EMAIL_USE_TLS y EMAIL_USE_SSL no pueden estar activos al mismo tiempo.",
            id="medicore_email.E001",
        ))
    if settings.EMAIL_BACKEND == SMTP_BACKEND:
        missing = [name for name, value in {
            "EMAIL_HOST": settings.EMAIL_HOST,
            "EMAIL_HOST_USER": settings.EMAIL_HOST_USER,
            "EMAIL_HOST_PASSWORD": settings.EMAIL_HOST_PASSWORD,
        }.items() if not value]
        if missing:
            messages.append(Error(
                f"Configuración SMTP incompleta: {', '.join(missing)}.",
                id="medicore_email.E002",
            ))
    if not settings.DEBUG and settings.DEFAULT_FROM_EMAIL.endswith("@medicore.local"):
        messages.append(Warning(
            "DEFAULT_FROM_EMAIL todavía utiliza el dominio local y no podrá entregarse en Internet.",
            id="medicore_email.W001",
        ))
    if not settings.DEBUG and settings.EMAIL_BACKEND in {
        "django.core.mail.backends.console.EmailBackend",
        "django.core.mail.backends.dummy.EmailBackend",
    }:
        messages.append(Warning(
            "El backend de correo configurado no entrega mensajes reales.",
            id="medicore_email.W002",
        ))
    return messages
