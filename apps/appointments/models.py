from datetime import datetime, timedelta

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from apps.clinic_settings.utils import clinic_setting
from apps.core.models import TimeStampedModel
from apps.doctors.models import DoctorSchedule


class Appointment(TimeStampedModel):
    class Status(models.TextChoices):
        PENDIENTE = "pendiente", "Pendiente"
        CONFIRMADA = "confirmada", "Confirmada"
        CANCELADA = "cancelada", "Cancelada"
        ATENDIDA = "atendida", "Atendida"
        NO_ASISTIO = "no_asistio", "No asistio"
        REPROGRAMADA = "reprogramada", "Reprogramada"

    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.PROTECT, related_name="appointments")
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT, related_name="appointments")
    doctor = models.ForeignKey("doctors.DoctorProfile", on_delete=models.PROTECT, related_name="appointments")
    created_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="appointments_created")
    scheduled_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    reason = models.CharField(max_length=250)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.PENDIENTE)
    cancellation_reason = models.TextField(blank=True)
    cancelled_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="appointments_cancelled")
    cancelled_at = models.DateTimeField(null=True, blank=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    attended_at = models.DateTimeField(null=True, blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["scheduled_date", "start_time"]
        indexes = [
            models.Index(fields=["clinic", "scheduled_date"]),
            models.Index(fields=["doctor", "scheduled_date"]),
            models.Index(fields=["patient", "scheduled_date"]),
            models.Index(fields=["status"]),
        ]

    def clean(self):
        if self.patient_id and self.doctor_id:
            if self.patient.clinic_id != self.doctor.clinic_id:
                raise ValidationError("El paciente y el medico deben pertenecer a la misma clinica.")
            if self.clinic_id and self.clinic_id != self.doctor.clinic_id:
                raise ValidationError("La cita debe pertenecer a la misma clinica del medico.")
        if self.start_time and self.end_time and self.start_time >= self.end_time:
            raise ValidationError("La hora inicial debe ser menor que la hora final.")
        if self.doctor_id and not self.doctor.activo:
            raise ValidationError("El medico debe estar activo.")
        if self.patient_id and not self.patient.activo:
            raise ValidationError("El paciente debe estar activo.")
        if self.scheduled_date and self.start_time and self.end_time and self.doctor_id:
            self._validate_inside_doctor_schedule()
            self._validate_no_overlaps()

    def _weekday_value(self):
        mapping = {
            0: "lunes",
            1: "martes",
            2: "miercoles",
            3: "jueves",
            4: "viernes",
            5: "sabado",
            6: "domingo",
        }
        return mapping[self.scheduled_date.weekday()]

    def _validate_inside_doctor_schedule(self):
        exists = DoctorSchedule.objects.filter(
            doctor=self.doctor,
            dia_semana=self._weekday_value(),
            activo=True,
            hora_inicio__lte=self.start_time,
            hora_fin__gte=self.end_time,
        ).exists()
        if not exists:
            raise ValidationError("La cita debe caer dentro del horario disponible del medico.")

    def _validate_no_overlaps(self):
        active_statuses = [self.Status.PENDIENTE, self.Status.CONFIRMADA, self.Status.REPROGRAMADA]
        doctor_overlap = Appointment.objects.filter(
            doctor=self.doctor,
            scheduled_date=self.scheduled_date,
            status__in=active_statuses,
            activo=True,
            start_time__lt=self.end_time,
            end_time__gt=self.start_time,
        )
        patient_overlap = Appointment.objects.filter(
            patient=self.patient,
            scheduled_date=self.scheduled_date,
            status__in=active_statuses,
            activo=True,
            start_time__lt=self.end_time,
            end_time__gt=self.start_time,
        )
        if self.pk:
            doctor_overlap = doctor_overlap.exclude(pk=self.pk)
            patient_overlap = patient_overlap.exclude(pk=self.pk)
        if doctor_overlap.exists():
            raise ValidationError("El medico ya tiene una cita en ese horario.")
        if patient_overlap.exists():
            raise ValidationError("El paciente ya tiene una cita en ese horario.")

    def set_default_end_time(self):
        if self.start_time and not self.end_time and self.doctor_id:
            start = datetime.combine(self.scheduled_date or timezone.localdate(), self.start_time)
            duration = clinic_setting(self.doctor.clinic, "appointment_duration_minutes", self.doctor.duracion_consulta_minutos)
            self.end_time = (start + timedelta(minutes=duration)).time()

    def save(self, *args, **kwargs):
        if self.doctor_id and not self.clinic_id:
            self.clinic = self.doctor.clinic
        self.set_default_end_time()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.scheduled_date} {self.start_time} - {self.patient.nombre_completo}"
