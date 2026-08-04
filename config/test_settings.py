from config.settings import *  # noqa: F403


PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
REQUEST_METRICS_ENABLED = False
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
