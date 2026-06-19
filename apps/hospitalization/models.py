from decimal import Decimal, ROUND_HALF_UP

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.core.models import TimeStampedModel


class HospitalRoom(TimeStampedModel):
    class RoomType(models.TextChoices):
        GENERAL = "general", "General"
        PRIVATE = "private", "Privada"
        EMERGENCY = "emergency", "Emergencia"
        OBSERVATION = "observation", "Observacion"
        PEDIATRIC = "pediatric", "Pediatria"
        MATERNITY = "maternity", "Maternidad"
        INTENSIVE_CARE = "intensive_care", "Cuidados intensivos"
        OTHER = "other", "Otro"

    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.PROTECT, related_name="hospital_rooms")
    name = models.CharField(max_length=120)
    room_number = models.CharField(max_length=40)
    floor = models.CharField(max_length=40, blank=True)
    room_type = models.CharField(max_length=30, choices=RoomType.choices, default=RoomType.GENERAL)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["clinic", "room_number", "name"]
        constraints = [
            models.UniqueConstraint(fields=["clinic", "room_number"], name="unique_hospital_room_number_per_clinic"),
        ]
        indexes = [
            models.Index(fields=["clinic", "is_active"]),
            models.Index(fields=["room_type"]),
        ]

    def __str__(self):
        return f"{self.room_number} - {self.name}"


class HospitalBed(TimeStampedModel):
    class Status(models.TextChoices):
        AVAILABLE = "available", "Disponible"
        OCCUPIED = "occupied", "Ocupada"
        CLEANING = "cleaning", "Limpieza"
        MAINTENANCE = "maintenance", "Mantenimiento"
        BLOCKED = "blocked", "Bloqueada"

    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.PROTECT, related_name="hospital_beds")
    room = models.ForeignKey(HospitalRoom, on_delete=models.PROTECT, related_name="beds")
    bed_number = models.CharField(max_length=40)
    bed_code = models.CharField(max_length=80)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.AVAILABLE)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["room__room_number", "bed_number"]
        constraints = [
            models.UniqueConstraint(fields=["clinic", "bed_code"], name="unique_hospital_bed_code_per_clinic"),
        ]
        indexes = [
            models.Index(fields=["clinic", "status", "is_active"]),
            models.Index(fields=["room", "status"]),
        ]

    def clean(self):
        if self.room_id and self.clinic_id and self.room.clinic_id != self.clinic_id:
            raise ValidationError("La cama debe pertenecer a una habitacion de la misma clinica.")
        if self.pk and self.status == self.Status.AVAILABLE and self.active_hospitalizations.exists():
            raise ValidationError("No se puede marcar disponible una cama con internamiento activo.")

    def save(self, *args, **kwargs):
        if self.room_id and not self.clinic_id:
            self.clinic = self.room.clinic
        if not self.bed_code and self.room_id:
            self.bed_code = f"{self.room.room_number}-{self.bed_number}".strip("-")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return self.bed_code


class Hospitalization(TimeStampedModel):
    class AdmissionSource(models.TextChoices):
        CONSULTATION = "consultation", "Consulta"
        EMERGENCY = "emergency", "Emergencia"
        RECEPTION = "reception", "Recepcion"
        TRANSFER = "transfer", "Traslado"
        OTHER = "other", "Otro"

    class Status(models.TextChoices):
        ACTIVE = "active", "Activo"
        OBSERVATION = "observation", "Observacion"
        TRANSFERRED = "transferred", "Trasladado"
        DISCHARGED = "discharged", "Alta"
        CANCELLED = "cancelled", "Cancelado"

    ACTIVE_STATUSES = [Status.ACTIVE, Status.OBSERVATION, Status.TRANSFERRED]

    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.PROTECT, related_name="hospitalizations")
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT, related_name="hospitalizations")
    visit = models.ForeignKey("admissions.PatientVisit", on_delete=models.SET_NULL, null=True, blank=True, related_name="hospitalizations")
    consultation = models.ForeignKey("medical_records.ClinicalConsultation", on_delete=models.SET_NULL, null=True, blank=True, related_name="hospitalizations")
    admission_source = models.CharField(max_length=30, choices=AdmissionSource.choices, default=AdmissionSource.RECEPTION)
    responsible_doctor = models.ForeignKey("doctors.DoctorProfile", on_delete=models.SET_NULL, null=True, blank=True, related_name="hospitalizations")
    admitted_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="hospitalizations_admitted")
    discharged_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="hospitalizations_discharged")
    current_bed = models.ForeignKey(HospitalBed, on_delete=models.SET_NULL, null=True, blank=True, related_name="active_hospitalizations")
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.ACTIVE)
    reason = models.TextField()
    diagnosis_at_admission = models.TextField(blank=True)
    admission_datetime = models.DateTimeField(default=timezone.now)
    discharge_datetime = models.DateTimeField(null=True, blank=True)
    discharge_reason = models.TextField(blank=True)
    discharge_notes = models.TextField(blank=True)
    transfer_notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-admission_datetime"]
        constraints = [
            models.UniqueConstraint(
                fields=["clinic", "patient"],
                condition=Q(status__in=["active", "observation", "transferred"]),
                name="unique_active_hospitalization_per_patient_clinic",
            ),
        ]
        indexes = [
            models.Index(fields=["clinic", "status"]),
            models.Index(fields=["patient", "status"]),
            models.Index(fields=["current_bed", "status"]),
            models.Index(fields=["admission_datetime"]),
        ]

    @property
    def is_active(self):
        return self.status in self.ACTIVE_STATUSES

    def clean(self):
        if self.patient_id and self.clinic_id and self.patient.clinic_id != self.clinic_id:
            raise ValidationError("El paciente debe pertenecer a la misma clinica.")
        if self.visit_id and self.visit.clinic_id != self.clinic_id:
            raise ValidationError("La visita debe pertenecer a la misma clinica.")
        if self.visit_id and self.visit.patient_id != self.patient_id:
            raise ValidationError("La visita debe pertenecer al mismo paciente.")
        if self.consultation_id and self.consultation.clinic_id != self.clinic_id:
            raise ValidationError("La consulta debe pertenecer a la misma clinica.")
        if self.consultation_id and self.consultation.patient_id != self.patient_id:
            raise ValidationError("La consulta debe pertenecer al mismo paciente.")
        if self.responsible_doctor_id and self.responsible_doctor.clinic_id != self.clinic_id:
            raise ValidationError("El medico responsable debe pertenecer a la misma clinica.")
        if self.current_bed_id and self.current_bed.clinic_id != self.clinic_id:
            raise ValidationError("La cama debe pertenecer a la misma clinica.")
        if self.status in [self.Status.DISCHARGED, self.Status.CANCELLED] and not self.discharge_datetime:
            self.discharge_datetime = timezone.now()

    def save(self, *args, **kwargs):
        if self.patient_id and not self.clinic_id:
            self.clinic = self.patient.clinic
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.patient.nombre_completo} - {self.get_status_display()}"


class HospitalBedAssignment(TimeStampedModel):
    hospitalization = models.ForeignKey(Hospitalization, on_delete=models.CASCADE, related_name="bed_assignments")
    bed = models.ForeignKey(HospitalBed, on_delete=models.PROTECT, related_name="assignments")
    assigned_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="hospital_bed_assignments")
    assigned_at = models.DateTimeField(default=timezone.now)
    released_at = models.DateTimeField(null=True, blank=True)
    release_reason = models.CharField(max_length=120, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-assigned_at"]
        indexes = [
            models.Index(fields=["hospitalization", "assigned_at"]),
            models.Index(fields=["bed", "released_at"]),
        ]

    def clean(self):
        if self.hospitalization_id and self.bed_id and self.hospitalization.clinic_id != self.bed.clinic_id:
            raise ValidationError("La cama y el internamiento deben pertenecer a la misma clinica.")


class HospitalVitalSigns(TimeStampedModel):
    hospitalization = models.ForeignKey(Hospitalization, on_delete=models.CASCADE, related_name="vital_signs")
    temperature = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    blood_pressure_systolic = models.PositiveSmallIntegerField(null=True, blank=True)
    blood_pressure_diastolic = models.PositiveSmallIntegerField(null=True, blank=True)
    heart_rate = models.PositiveSmallIntegerField(null=True, blank=True)
    respiratory_rate = models.PositiveSmallIntegerField(null=True, blank=True)
    oxygen_saturation = models.PositiveSmallIntegerField(null=True, blank=True)
    weight = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    height = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    bmi = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    glucose = models.PositiveSmallIntegerField(null=True, blank=True)
    pain_scale = models.PositiveSmallIntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="hospital_vital_signs")
    recorded_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-recorded_at"]
        indexes = [
            models.Index(fields=["hospitalization", "recorded_at"]),
        ]

    def clean(self):
        if self.hospitalization_id and not self.hospitalization.is_active:
            raise ValidationError("No se pueden registrar signos vitales sin hospitalizacion activa.")
        ranges = [
            (self.temperature, Decimal("30"), Decimal("45"), "temperature"),
            (self.blood_pressure_systolic, 50, 260, "blood_pressure_systolic"),
            (self.blood_pressure_diastolic, 30, 180, "blood_pressure_diastolic"),
            (self.heart_rate, 20, 240, "heart_rate"),
            (self.respiratory_rate, 5, 80, "respiratory_rate"),
            (self.oxygen_saturation, 0, 100, "oxygen_saturation"),
            (self.weight, Decimal("0.5"), Decimal("400"), "weight"),
            (self.height, Decimal("0.30"), Decimal("2.50"), "height"),
            (self.glucose, 20, 700, "glucose"),
        ]
        errors = {}
        for value, low, high, field in ranges:
            if value is not None and (value < low or value > high):
                errors[field] = "Valor fuera de rango clinico razonable."
        if self.pain_scale is not None and (self.pain_scale < 0 or self.pain_scale > 10):
            errors["pain_scale"] = "La escala de dolor debe estar entre 0 y 10."
        if self.blood_pressure_systolic is not None and self.blood_pressure_diastolic is not None and self.blood_pressure_systolic <= self.blood_pressure_diastolic:
            errors["blood_pressure_systolic"] = "La presion sistolica debe ser mayor que la diastolica."
        if errors:
            raise ValidationError(errors)

    def calculate_bmi(self):
        if self.weight and self.height:
            self.bmi = (self.weight / (self.height * self.height)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    def save(self, *args, **kwargs):
        self.calculate_bmi()
        self.full_clean()
        return super().save(*args, **kwargs)


class NursingNote(TimeStampedModel):
    class NoteType(models.TextChoices):
        NORMAL = "normal", "Normal"
        IMPORTANT = "important", "Importante"
        URGENT = "urgent", "Urgente"
        MEDICATION = "medication", "Medicamento"
        OBSERVATION = "observation", "Observacion"
        INCIDENT = "incident", "Incidente"

    hospitalization = models.ForeignKey(Hospitalization, on_delete=models.CASCADE, related_name="nursing_notes")
    note_type = models.CharField(max_length=30, choices=NoteType.choices, default=NoteType.NORMAL)
    title = models.CharField(max_length=160, blank=True)
    note = models.TextField()
    created_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="nursing_notes")
    recorded_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-recorded_at"]
        indexes = [
            models.Index(fields=["hospitalization", "recorded_at"]),
            models.Index(fields=["note_type"]),
        ]

    def clean(self):
        if self.hospitalization_id and not self.hospitalization.is_active:
            raise ValidationError("No se pueden crear notas de enfermeria sin hospitalizacion activa.")
        if not self.note:
            raise ValidationError("La nota de enfermeria es obligatoria.")


class HospitalizationEvent(TimeStampedModel):
    hospitalization = models.ForeignKey(Hospitalization, on_delete=models.CASCADE, related_name="events")
    event_type = models.CharField(max_length=80)
    description = models.TextField()
    created_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="hospitalization_events")
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-creado_en"]
        indexes = [
            models.Index(fields=["hospitalization", "event_type"]),
            models.Index(fields=["event_type", "creado_en"]),
        ]
