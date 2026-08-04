from datetime import timedelta
from pathlib import Path

from decouple import Csv, config
from corsheaders.defaults import default_headers
from django.core.exceptions import ImproperlyConfigured


BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config("SECRET_KEY", default="django-insecure-medicore-dev-key")
DEBUG = config("DEBUG", default=True, cast=bool)
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="localhost,127.0.0.1", cast=Csv())

if not DEBUG and (not SECRET_KEY or SECRET_KEY.startswith("django-insecure-")):
    raise ImproperlyConfigured("SECRET_KEY debe configurarse de forma segura cuando DEBUG=False.")


INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "drf_spectacular",
    "apps.core",
    "apps.clinics",
    "apps.accounts",
    "apps.doctors",
    "apps.patients",
    "apps.appointments",
    "apps.admissions",
    "apps.hospitalization",
    "apps.medical_records",
    "apps.prescriptions",
    "apps.billing",
    "apps.inventory",
    "apps.purchases",
    "apps.reports",
    "apps.audit",
    "apps.notifications",
    "apps.clinic_settings",
    "apps.subscriptions",
    "apps.patient_portal",
    "apps.documents",
    "apps.security",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "apps.core.middleware.RequestIDMiddleware",
    "apps.core.middleware.RequestPerformanceMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "apps.audit.middleware.AuditPermissionDeniedMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

if config("DB_ENGINE", default="mysql") == "sqlite":
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.mysql",
            "NAME": config("DB_NAME", default="medicore_db"),
            "USER": config("DB_USER", default="root"),
            "PASSWORD": config("DB_PASSWORD", default=""),
            "HOST": config("DB_HOST", default="localhost"),
            "PORT": config("DB_PORT", default="3306"),
            "OPTIONS": {
                "charset": "utf8mb4",
            },
        },
    }

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "es-hn"
TIME_ZONE = "America/Tegucigalpa"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

DOCUMENT_MAX_UPLOAD_SIZE_MB = config("DOCUMENT_MAX_UPLOAD_SIZE_MB", default=10, cast=int)
DOCUMENT_ALLOWED_EXTENSIONS = config("DOCUMENT_ALLOWED_EXTENSIONS", default="pdf,jpg,jpeg,png,webp,doc,docx,xls,xlsx")
DOCUMENT_STORAGE_BACKEND = config("DOCUMENT_STORAGE_BACKEND", default="local")
DEFAULT_FROM_EMAIL = config("DEFAULT_FROM_EMAIL", default="no-reply@medicore.local")
FRONTEND_URL = config("FRONTEND_URL", default="http://localhost:5173")
PASSWORD_RESET_TOKEN_MINUTES = config("PASSWORD_RESET_TOKEN_MINUTES", default=30, cast=int)
EMAIL_VERIFICATION_TOKEN_MINUTES = config("EMAIL_VERIFICATION_TOKEN_MINUTES", default=60, cast=int)
MAX_FAILED_LOGIN_ATTEMPTS = config("MAX_FAILED_LOGIN_ATTEMPTS", default=5, cast=int)
ACCOUNT_LOCKOUT_MINUTES = config("ACCOUNT_LOCKOUT_MINUTES", default=15, cast=int)
SESSION_LIFETIME_MINUTES = config("SESSION_LIFETIME_MINUTES", default=1440, cast=int)
AUDIT_RETENTION_DAYS = config("AUDIT_RETENTION_DAYS", default=365, cast=int)
EMAIL_BACKEND = config("EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend")
EMAIL_HOST = config("EMAIL_HOST", default="")
EMAIL_PORT = config("EMAIL_PORT", default=587, cast=int)
EMAIL_HOST_USER = config("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = config("EMAIL_HOST_PASSWORD", default="")
EMAIL_USE_TLS = config("EMAIL_USE_TLS", default=True, cast=bool)
EMAIL_USE_SSL = config("EMAIL_USE_SSL", default=False, cast=bool)
EMAIL_TIMEOUT = config("EMAIL_TIMEOUT", default=10, cast=int)
EMAIL_REPLY_TO = config("EMAIL_REPLY_TO", default="")
EMAIL_NOTIFICATIONS_ENABLED = config("EMAIL_NOTIFICATIONS_ENABLED", default=True, cast=bool)
INVENTORY_EXPIRATION_ALERT_DAYS = config("INVENTORY_EXPIRATION_ALERT_DAYS", default=30, cast=int)
EMAIL_NOTIFICATION_MODULES = config(
    "EMAIL_NOTIFICATION_MODULES",
    default="appointments,billing,payments,cash,inventory,purchases,audit,system",
    cast=Csv(),
)
REQUEST_METRICS_ENABLED = config("REQUEST_METRICS_ENABLED", default=True, cast=bool)
SLOW_REQUEST_THRESHOLD_MS = config("SLOW_REQUEST_THRESHOLD_MS", default=750, cast=int)
MEDICORE_BACKUP_STATUS_FILE = config(
    "MEDICORE_BACKUP_STATUS_FILE",
    default="/var/lib/medicore/backup-status.json",
)

CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS",
    default="http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173",
    cast=Csv(),
)
CSRF_TRUSTED_ORIGINS = config("CSRF_TRUSTED_ORIGINS", default="", cast=Csv())
CORS_ALLOW_CREDENTIALS = config("CORS_ALLOW_CREDENTIALS", default=False, cast=bool)
CORS_ALLOW_HEADERS = list(default_headers) + [
    "x-session-key",
]
CORS_EXPOSE_HEADERS = ["Link", "Server-Timing", "X-Page", "X-Page-Size", "X-Request-ID", "X-Total-Count", "X-Total-Pages"]

SECURE_SSL_REDIRECT = config("SECURE_SSL_REDIRECT", default=False, cast=bool)
SESSION_COOKIE_SECURE = config("SESSION_COOKIE_SECURE", default=False, cast=bool)
CSRF_COOKIE_SECURE = config("CSRF_COOKIE_SECURE", default=False, cast=bool)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_HSTS_SECONDS = config("SECURE_HSTS_SECONDS", default=0, cast=int)
SECURE_HSTS_INCLUDE_SUBDOMAINS = config("SECURE_HSTS_INCLUDE_SUBDOMAINS", default=False, cast=bool)
SECURE_HSTS_PRELOAD = config("SECURE_HSTS_PRELOAD", default=False, cast=bool)
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
X_FRAME_OPTIONS = "DENY"
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "apps.security.authentication.SessionBoundJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "apps.core.exceptions.medicore_exception_handler",
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.LegacyCompatiblePageNumberPagination",
    "PAGE_SIZE": 50,
    "DEFAULT_THROTTLE_RATES": {
        "login_ip": config("LOGIN_IP_THROTTLE_RATE", default="30/minute"),
        "login_identifier": config("LOGIN_IDENTIFIER_THROTTLE_RATE", default="10/minute"),
        "password_reset": config("PASSWORD_RESET_THROTTLE_RATE", default="5/hour"),
        "email_verification": config("EMAIL_VERIFICATION_THROTTLE_RATE", default="5/hour"),
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "AUTH_HEADER_TYPES": ("Bearer",),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": False,
}

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "filters": {"redact_sensitive": {"()": "apps.core.logging.SensitiveDataFilter"}},
    "formatters": {
        "standard": {
            "format": "{levelname} {asctime} request_id={request_id} {name}: {message}",
            "style": "{",
        }
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "filters": ["redact_sensitive"],
            "formatter": "standard",
        }
    },
    "loggers": {
        "django": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "apps": {"handlers": ["console"], "level": "INFO", "propagate": False},
    },
}

SPECTACULAR_SETTINGS = {
    "TITLE": "MediCore API",
    "DESCRIPTION": "API base para usuarios, roles, clínicas y autenticación JWT.",
    "VERSION": "0.1.0",
}
