from django.core.exceptions import ValidationError
from django.db import models

from apps.clinic_settings.utils import clinic_prefix, next_sequence_number
from apps.core.models import TimeStampedModel


class Patient(TimeStampedModel):
    class Gender(models.TextChoices):
        MASCULINO = "masculino", "Masculino"
        FEMENINO = "femenino", "Femenino"
        OTRO = "otro", "Otro"
        NO_ESPECIFICADO = "no_especificado", "No especificado"

    class BloodType(models.TextChoices):
        A_POS = "A+", "A+"
        A_NEG = "A-", "A-"
        B_POS = "B+", "B+"
        B_NEG = "B-", "B-"
        AB_POS = "AB+", "AB+"
        AB_NEG = "AB-", "AB-"
        O_POS = "O+", "O+"
        O_NEG = "O-", "O-"
        DESCONOCIDO = "desconocido", "Desconocido"

    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.PROTECT, related_name="patients")
    user = models.OneToOneField("accounts.User", on_delete=models.PROTECT, related_name="patient_profile", null=True, blank=True)
    codigo_paciente = models.CharField(max_length=30)
    nombres = models.CharField(max_length=120)
    apellidos = models.CharField(max_length=120)
    nombre_completo = models.CharField(max_length=250, blank=True)
    identidad = models.CharField(max_length=40, blank=True)
    fecha_nacimiento = models.DateField(null=True, blank=True)
    genero = models.CharField(max_length=30, choices=Gender.choices, default=Gender.NO_ESPECIFICADO)
    tipo_sangre = models.CharField(max_length=20, choices=BloodType.choices, default=BloodType.DESCONOCIDO)
    telefono = models.CharField(max_length=30, blank=True)
    correo = models.EmailField(blank=True)
    direccion = models.TextField(blank=True)
    ciudad = models.CharField(max_length=80, blank=True)
    departamento = models.CharField(max_length=80, blank=True)
    pais = models.CharField(max_length=80, blank=True, default="Honduras")
    contacto_emergencia_nombre = models.CharField(max_length=160, blank=True)
    contacto_emergencia_telefono = models.CharField(max_length=30, blank=True)
    contacto_emergencia_parentesco = models.CharField(max_length=80, blank=True)
    alergias = models.TextField(blank=True)
    enfermedades_cronicas = models.TextField(blank=True)
    observaciones = models.TextField(blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["nombre_completo"]
        constraints = [
            models.UniqueConstraint(fields=["clinic", "codigo_paciente"], name="unique_patient_code_per_clinic"),
            models.UniqueConstraint(fields=["clinic", "identidad"], condition=~models.Q(identidad=""), name="unique_patient_identity_per_clinic"),
        ]

    def clean(self):
        if not self.nombres:
            raise ValidationError("Los nombres son obligatorios.")
        if not self.apellidos:
            raise ValidationError("Los apellidos son obligatorios.")
        if self.user_id:
            if getattr(self.user.role, "nombre", None) != "paciente":
                raise ValidationError("El usuario vinculado debe tener rol paciente.")
            if self.user.clinica_id != self.clinic_id:
                raise ValidationError("El usuario vinculado debe pertenecer a la misma clinica.")

    def save(self, *args, **kwargs):
        self.nombre_completo = f"{self.nombres} {self.apellidos}".strip()
        if not self.codigo_paciente and self.clinic_id:
            self.codigo_paciente = self.generate_patient_code()
        self.full_clean()
        return super().save(*args, **kwargs)

    def generate_patient_code(self):
        prefix = clinic_prefix(self.clinic, "patient_prefix", "PAC")
        return next_sequence_number(Patient, self.clinic, "codigo_paciente", prefix)

    def __str__(self):
        return f"{self.codigo_paciente} - {self.nombre_completo}"
