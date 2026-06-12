from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone

from apps.accounts.managers import UserManager
from apps.core.models import TimeStampedModel


class Role(TimeStampedModel):
    nombre = models.CharField(max_length=50, unique=True)
    descripcion = models.TextField(blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre


class User(AbstractBaseUser, PermissionsMixin, TimeStampedModel):
    clinica = models.ForeignKey(
        "clinics.Clinic",
        on_delete=models.PROTECT,
        related_name="usuarios",
        null=True,
        blank=True,
    )
    role = models.ForeignKey(
        Role,
        on_delete=models.PROTECT,
        related_name="usuarios",
    )
    nombre_completo = models.CharField(max_length=180)
    email = models.EmailField(unique=True)
    telefono = models.CharField(max_length=30, blank=True)
    avatar_url = models.URLField(blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    ultimo_acceso = models.DateTimeField(null=True, blank=True)
    email_verified = models.BooleanField(default=False)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    last_login_user_agent = models.TextField(blank=True)
    password_changed_at = models.DateTimeField(null=True, blank=True)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["nombre_completo"]

    class Meta:
        ordering = ["nombre_completo"]

    def __str__(self):
        return self.email

    @property
    def role_name(self):
        return self.role.nombre if self.role_id else None
