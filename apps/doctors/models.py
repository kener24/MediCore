from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models

from apps.core.models import TimeStampedModel


class MedicalSpecialty(TimeStampedModel):
    nombre = models.CharField(max_length=120, unique=True)
    descripcion = models.TextField(blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre


class DoctorProfile(TimeStampedModel):
    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.PROTECT, related_name="doctor_profiles")
    user = models.OneToOneField("accounts.User", on_delete=models.PROTECT, related_name="doctor_profile")
    specialty = models.ForeignKey(MedicalSpecialty, on_delete=models.PROTECT, related_name="doctor_profiles")
    numero_colegiacion = models.CharField(max_length=80)
    titulo_profesional = models.CharField(max_length=180, blank=True)
    biografia = models.TextField(blank=True)
    tarifa_consulta = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    duracion_consulta_minutos = models.PositiveIntegerField(default=30)
    atiende_virtual = models.BooleanField(default=False)
    atiende_presencial = models.BooleanField(default=True)
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["user__nombre_completo"]
        constraints = [
            models.UniqueConstraint(fields=["clinic", "numero_colegiacion"], name="unique_doctor_license_per_clinic"),
        ]

    def clean(self):
        if self.user_id:
            if getattr(self.user.role, "nombre", None) != "medico":
                raise ValidationError("Solo usuarios con rol medico pueden tener perfil medico.")
            if self.user.clinica_id != self.clinic_id:
                raise ValidationError("El perfil medico debe pertenecer a la misma clinica del usuario.")
        if self.specialty_id and not self.specialty.activo:
            raise ValidationError("La especialidad debe estar activa.")
        if self.tarifa_consulta is not None and self.tarifa_consulta < 0:
            raise ValidationError("La tarifa de consulta no puede ser negativa.")
        if self.duracion_consulta_minutos <= 0:
            raise ValidationError("La duracion de consulta debe ser mayor que 0.")

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return self.user.nombre_completo


class DoctorSchedule(TimeStampedModel):
    class WeekDay(models.TextChoices):
        LUNES = "lunes", "Lunes"
        MARTES = "martes", "Martes"
        MIERCOLES = "miercoles", "Miercoles"
        JUEVES = "jueves", "Jueves"
        VIERNES = "viernes", "Viernes"
        SABADO = "sabado", "Sabado"
        DOMINGO = "domingo", "Domingo"

    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE, related_name="schedules")
    dia_semana = models.CharField(max_length=20, choices=WeekDay.choices)
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["doctor", "dia_semana", "hora_inicio"]
        constraints = [
            models.UniqueConstraint(
                fields=["doctor", "dia_semana", "hora_inicio", "hora_fin"],
                name="unique_exact_doctor_schedule",
            ),
        ]

    def clean(self):
        if self.hora_inicio and self.hora_fin and self.hora_inicio >= self.hora_fin:
            raise ValidationError("La hora inicial debe ser menor que la hora final.")
        overlapping = DoctorSchedule.objects.filter(
            doctor=self.doctor,
            dia_semana=self.dia_semana,
            activo=True,
            hora_inicio__lt=self.hora_fin,
            hora_fin__gt=self.hora_inicio,
        )
        if self.pk:
            overlapping = overlapping.exclude(pk=self.pk)
        if self.activo and overlapping.exists():
            raise ValidationError("No puedes crear horarios cruzados para el mismo medico.")

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.doctor} {self.dia_semana} {self.hora_inicio}-{self.hora_fin}"

