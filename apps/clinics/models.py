from django.db import models

from apps.core.models import TimeStampedModel


class Clinic(TimeStampedModel):
    nombre = models.CharField(max_length=180)
    rtn = models.CharField(max_length=50, blank=True)
    telefono = models.CharField(max_length=30, blank=True)
    correo = models.EmailField(blank=True)
    direccion = models.TextField(blank=True)
    activo = models.BooleanField(default=True)
    creation_idempotency_key = models.CharField(max_length=100, null=True, blank=True, unique=True, editable=False)
    creation_fingerprint = models.CharField(max_length=64, null=True, blank=True, unique=True, editable=False)

    class Meta:
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre
