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

    def clean(self):
        self.name = (self.name or "").strip()
        self.room_number = (self.room_number or "").strip()
        if not self.name:
            raise ValidationError({"name": "El nombre de la habitacion es obligatorio."})
        if not self.room_number:
            raise ValidationError({"room_number": "El numero de habitacion es obligatorio."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.room_number} - {self.name}"

    def delete(self, *args, **kwargs):
        if self.beds.exists():
            raise ValidationError("No se puede eliminar una habitacion con historial de camas.")
        return super().delete(*args, **kwargs)


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
        self.bed_number = (self.bed_number or "").strip()
        self.bed_code = (self.bed_code or "").strip()
        if not self.bed_number:
            raise ValidationError({"bed_number": "El numero de cama es obligatorio."})
        if self.room_id and self.clinic_id and self.room.clinic_id != self.clinic_id:
            raise ValidationError("La cama debe pertenecer a una habitacion de la misma clinica.")
        active_assignments = self.assignments.filter(released_at__isnull=True) if self.pk else HospitalBedAssignment.objects.none()
        if self.status == self.Status.AVAILABLE and active_assignments.exists():
            raise ValidationError("No se puede marcar disponible una cama con internamiento activo.")
        if not self.is_active and active_assignments.exists():
            raise ValidationError("No se puede desactivar una cama con asignacion activa.")

    def save(self, *args, **kwargs):
        if self.room_id and not self.clinic_id:
            self.clinic = self.room.clinic
        if not self.bed_code and self.room_id:
            self.bed_code = f"{self.room.room_number}-{self.bed_number}".strip("-")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return self.bed_code

    def delete(self, *args, **kwargs):
        if self.assignments.exists():
            raise ValidationError("No se puede eliminar una cama con historial de asignaciones.")
        return super().delete(*args, **kwargs)


class Hospitalization(TimeStampedModel):
    class AdmissionSource(models.TextChoices):
        CONSULTATION = "consultation", "Consulta"
        EMERGENCY = "emergency", "Emergencia"
        RECEPTION = "reception", "Recepcion"
        TRANSFER = "transfer", "Traslado"
        OTHER = "other", "Otro"

    class Status(models.TextChoices):
        PENDING_ADMISSION = "pending_admission", "Pendiente de ingreso"
        ACTIVE = "active", "Activo"
        OBSERVATION = "observation", "Observacion"
        TRANSFERRED = "transferred", "Trasladado"
        DISCHARGE_PENDING = "discharge_pending", "Alta pendiente"
        DISCHARGED = "discharged", "Alta"
        CANCELLED = "cancelled", "Cancelado"

    ACTIVE_STATUSES = [Status.ACTIVE, Status.OBSERVATION, Status.TRANSFERRED, Status.DISCHARGE_PENDING]
    OPEN_STATUSES = [Status.PENDING_ADMISSION, *ACTIVE_STATUSES]

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
    expected_discharge_date = models.DateField(null=True, blank=True)
    idempotency_key = models.CharField(max_length=100, null=True, blank=True, default=None)
    discharge_datetime = models.DateTimeField(null=True, blank=True)
    discharge_reason = models.TextField(blank=True)
    discharge_notes = models.TextField(blank=True)
    transfer_notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-admission_datetime"]
        constraints = [
            models.UniqueConstraint(
                fields=["clinic", "patient"],
                condition=Q(status__in=["pending_admission", "active", "observation", "transferred", "discharge_pending"]),
                name="unique_active_hospitalization_per_patient_clinic",
            ),
            models.UniqueConstraint(fields=["clinic", "admitted_by", "idempotency_key"], name="unique_hospitalization_operation"),
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
    released_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="hospital_bed_releases")
    release_reason = models.CharField(max_length=120, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-assigned_at"]
        constraints = [
            models.UniqueConstraint(fields=["bed"], condition=Q(released_at__isnull=True), name="unique_active_assignment_per_bed"),
            models.UniqueConstraint(fields=["hospitalization"], condition=Q(released_at__isnull=True), name="unique_active_assignment_per_hospitalization"),
        ]
        indexes = [
            models.Index(fields=["hospitalization", "assigned_at"]),
            models.Index(fields=["bed", "released_at"]),
        ]

    def clean(self):
        if self.hospitalization_id and self.bed_id and self.hospitalization.clinic_id != self.bed.clinic_id:
            raise ValidationError("La cama y el internamiento deben pertenecer a la misma clinica.")

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Las asignaciones de cama forman parte del historial y no pueden eliminarse.")


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
    is_abnormal = models.BooleanField(default=False)
    alert_summary = models.CharField(max_length=250, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="hospital_vital_alerts_reviewed")

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

    def calculate_alerts(self):
        alerts = []
        if self.temperature is not None and (self.temperature < Decimal("35.0") or self.temperature >= Decimal("38.0")):
            alerts.append("Temperatura fuera del rango habitual")
        if self.oxygen_saturation is not None and self.oxygen_saturation < 92:
            alerts.append("Saturacion de oxigeno baja")
        if self.heart_rate is not None and (self.heart_rate < 50 or self.heart_rate > 120):
            alerts.append("Frecuencia cardiaca fuera del rango habitual")
        if self.blood_pressure_systolic is not None and (self.blood_pressure_systolic < 90 or self.blood_pressure_systolic > 180):
            alerts.append("Presion arterial sistolica fuera del rango habitual")
        if self.pain_scale is not None and self.pain_scale >= 7:
            alerts.append("Dolor intenso")
        self.is_abnormal = bool(alerts)
        self.alert_summary = "; ".join(alerts)

    def save(self, *args, **kwargs):
        self.calculate_bmi()
        self.calculate_alerts()
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

    class Shift(models.TextChoices):
        MORNING = "morning", "Manana"
        AFTERNOON = "afternoon", "Tarde"
        NIGHT = "night", "Noche"
        OTHER = "other", "Otro"

    class Status(models.TextChoices):
        SIGNED = "signed", "Firmada"
        CORRECTION = "correction", "Correccion"

    hospitalization = models.ForeignKey(Hospitalization, on_delete=models.CASCADE, related_name="nursing_notes")
    note_type = models.CharField(max_length=30, choices=NoteType.choices, default=NoteType.NORMAL)
    title = models.CharField(max_length=160, blank=True)
    note = models.TextField()
    shift = models.CharField(max_length=20, choices=Shift.choices, default=Shift.OTHER)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SIGNED)
    correction_of = models.ForeignKey("self", on_delete=models.PROTECT, null=True, blank=True, related_name="corrections")
    correction_reason = models.CharField(max_length=250, blank=True)
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
        if self.correction_of_id and not self.correction_reason.strip():
            raise ValidationError({"correction_reason": "El motivo de correccion es obligatorio."})

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValidationError("Las notas firmadas no pueden editarse; registra una correccion.")
        self.full_clean()
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Las notas de enfermeria firmadas no pueden eliminarse.")


class HospitalizationEvent(TimeStampedModel):
    class Severity(models.TextChoices):
        INFO = "info", "Informativo"
        WARNING = "warning", "Advertencia"
        CRITICAL = "critical", "Critico"

    hospitalization = models.ForeignKey(Hospitalization, on_delete=models.CASCADE, related_name="events")
    event_type = models.CharField(max_length=80)
    description = models.TextField()
    severity = models.CharField(max_length=20, choices=Severity.choices, default=Severity.INFO)
    event_datetime = models.DateTimeField(default=timezone.now)
    created_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="hospitalization_events")
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-creado_en"]
        indexes = [
            models.Index(fields=["hospitalization", "event_type"]),
            models.Index(fields=["event_type", "creado_en"]),
        ]


class MedicalEvolution(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Borrador"
        SIGNED = "signed", "Firmada"
        CORRECTION = "correction", "Correccion"

    hospitalization = models.ForeignKey(Hospitalization, on_delete=models.PROTECT, related_name="medical_evolutions")
    doctor = models.ForeignKey("doctors.DoctorProfile", on_delete=models.PROTECT, related_name="hospital_evolutions")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    subjective = models.TextField(blank=True)
    objective = models.TextField(blank=True)
    assessment = models.TextField(blank=True)
    plan = models.TextField(blank=True)
    progress_notes = models.TextField(blank=True)
    diagnosis_changes = models.TextField(blank=True)
    treatment_changes = models.TextField(blank=True)
    observations = models.TextField(blank=True)
    signed_at = models.DateTimeField(null=True, blank=True)
    correction_of = models.ForeignKey("self", on_delete=models.PROTECT, null=True, blank=True, related_name="corrections")
    correction_reason = models.CharField(max_length=250, blank=True)

    class Meta:
        ordering = ["-creado_en"]
        indexes = [models.Index(fields=["hospitalization", "status", "creado_en"]), models.Index(fields=["doctor", "creado_en"])]

    def clean(self):
        if self.hospitalization_id and self.doctor_id and self.hospitalization.clinic_id != self.doctor.clinic_id:
            raise ValidationError("La evolucion y el medico deben pertenecer a la misma clinica.")
        content = [self.subjective, self.objective, self.assessment, self.plan, self.progress_notes]
        if not any((value or "").strip() for value in content):
            raise ValidationError("La evolucion medica requiere contenido clinico.")
        if self.status == self.Status.CORRECTION and (not self.correction_of_id or not self.correction_reason.strip()):
            raise ValidationError("La correccion requiere evolucion original y motivo.")

    def save(self, *args, **kwargs):
        if self.pk:
            original = type(self).objects.get(pk=self.pk)
            if original.status in [self.Status.SIGNED, self.Status.CORRECTION]:
                raise ValidationError("La evolucion firmada no puede editarse; registra una correccion.")
        self.full_clean()
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        if self.status != self.Status.DRAFT:
            raise ValidationError("Las evoluciones firmadas no pueden eliminarse.")
        return super().delete(*args, **kwargs)


class TreatmentPlan(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Borrador"
        ACTIVE = "active", "Activo"
        REPLACED = "replaced", "Reemplazado"
        COMPLETED = "completed", "Completado"
        CANCELLED = "cancelled", "Cancelado"

    hospitalization = models.ForeignKey(Hospitalization, on_delete=models.PROTECT, related_name="treatment_plans")
    doctor = models.ForeignKey("doctors.DoctorProfile", on_delete=models.PROTECT, related_name="hospital_treatment_plans")
    version = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    goals = models.TextField(blank=True)
    treatment = models.TextField()
    monitoring = models.TextField(blank=True)
    diet = models.TextField(blank=True)
    activity = models.TextField(blank=True)
    precautions = models.TextField(blank=True)
    expected_duration = models.CharField(max_length=120, blank=True)
    effective_from = models.DateTimeField(default=timezone.now)
    effective_until = models.DateTimeField(null=True, blank=True)
    change_reason = models.CharField(max_length=250, blank=True)
    replaces = models.ForeignKey("self", on_delete=models.PROTECT, null=True, blank=True, related_name="replacements")

    class Meta:
        ordering = ["-version", "-creado_en"]
        constraints = [models.UniqueConstraint(fields=["hospitalization", "version"], name="unique_treatment_plan_version")]
        indexes = [models.Index(fields=["hospitalization", "status"])]

    def clean(self):
        if self.hospitalization_id and self.doctor_id and self.hospitalization.clinic_id != self.doctor.clinic_id:
            raise ValidationError("El plan y el medico deben pertenecer a la misma clinica.")
        if not (self.treatment or "").strip():
            raise ValidationError({"treatment": "El tratamiento es obligatorio."})
        if self.replaces_id and not self.change_reason.strip():
            raise ValidationError({"change_reason": "El motivo del cambio es obligatorio."})

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValidationError("Los planes de tratamiento no se sobrescriben; crea una nueva version.")
        self.full_clean()
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Los planes de tratamiento forman parte del historial clinico.")


class MedicalInstruction(TimeStampedModel):
    class InstructionType(models.TextChoices):
        MEDICATION = "medication", "Medicamento"
        MONITORING = "monitoring", "Monitorizacion"
        DIET = "diet", "Dieta"
        ACTIVITY = "activity", "Actividad"
        PROCEDURE = "procedure", "Procedimiento"
        WOUND_CARE = "wound_care", "Curacion"
        VITAL_SIGNS = "vital_signs", "Control de signos"
        LABORATORY = "laboratory", "Laboratorio"
        IMAGING = "imaging", "Imagen"
        OTHER = "other", "Otra"

    class Priority(models.TextChoices):
        ROUTINE = "routine", "Rutina"
        URGENT = "urgent", "Urgente"
        STAT = "stat", "Inmediata"

    class Status(models.TextChoices):
        ACTIVE = "active", "Activa"
        ACKNOWLEDGED = "acknowledged", "Leida"
        IN_PROGRESS = "in_progress", "En proceso"
        COMPLETED = "completed", "Completada"
        SUSPENDED = "suspended", "Suspendida"
        CANCELLED = "cancelled", "Cancelada"

    hospitalization = models.ForeignKey(Hospitalization, on_delete=models.PROTECT, related_name="medical_instructions")
    treatment_plan = models.ForeignKey(TreatmentPlan, on_delete=models.PROTECT, null=True, blank=True, related_name="instructions")
    doctor = models.ForeignKey("doctors.DoctorProfile", on_delete=models.PROTECT, related_name="hospital_instructions")
    instruction_type = models.CharField(max_length=30, choices=InstructionType.choices, default=InstructionType.OTHER)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.ROUTINE)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    title = models.CharField(max_length=180)
    details = models.TextField()
    frequency = models.CharField(max_length=120, blank=True)
    effective_from = models.DateTimeField(default=timezone.now)
    effective_until = models.DateTimeField(null=True, blank=True)
    acknowledged_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="hospital_instructions_acknowledged")
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="hospital_instructions_completed")
    completed_at = models.DateTimeField(null=True, blank=True)
    status_reason = models.CharField(max_length=250, blank=True)
    replaces = models.ForeignKey("self", on_delete=models.PROTECT, null=True, blank=True, related_name="replacements")

    class Meta:
        ordering = ["-effective_from", "-creado_en"]
        indexes = [models.Index(fields=["hospitalization", "status", "priority"])]

    def clean(self):
        if self.hospitalization_id and self.doctor_id and self.hospitalization.clinic_id != self.doctor.clinic_id:
            raise ValidationError("La indicacion y el medico deben pertenecer a la misma clinica.")
        if self.treatment_plan_id and self.treatment_plan.hospitalization_id != self.hospitalization_id:
            raise ValidationError("El plan no pertenece al internamiento.")
        if not self.title.strip() or not self.details.strip():
            raise ValidationError("La indicacion requiere titulo y detalle.")
        if self.status in [self.Status.SUSPENDED, self.Status.CANCELLED] and not self.status_reason.strip():
            raise ValidationError("La suspension o cancelacion requiere motivo.")

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Las indicaciones medicas forman parte del historial clinico.")


class NursingRound(TimeStampedModel):
    class RoundType(models.TextChoices):
        ROUTINE = "routine", "Rutina"
        URGENT = "urgent", "Urgente"
        MEDICATION = "medication", "Medicacion"
        FOLLOW_UP = "follow_up", "Seguimiento"
        OTHER = "other", "Otro"

    class Status(models.TextChoices):
        PENDING = "pending", "Pendiente"
        COMPLETED = "completed", "Completada"
        MISSED = "missed", "Omitida"
        PENDING_REVIEW = "pending_review", "Pendiente de revision"
        CANCELLED = "cancelled", "Cancelada"

    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.PROTECT, related_name="nursing_rounds")
    hospitalization = models.ForeignKey(Hospitalization, on_delete=models.CASCADE, related_name="nursing_rounds")
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT, related_name="nursing_rounds")
    nurse = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="nursing_rounds")
    round_type = models.CharField(max_length=30, choices=RoundType.choices, default=RoundType.ROUTINE)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.COMPLETED)
    notes = models.TextField(blank=True)
    general_condition = models.CharField(max_length=180, blank=True)
    pain_level = models.PositiveSmallIntegerField(null=True, blank=True)
    consciousness_status = models.CharField(max_length=120, blank=True)
    mobility_status = models.CharField(max_length=120, blank=True)
    feeding_status = models.CharField(max_length=120, blank=True)
    elimination_status = models.CharField(max_length=120, blank=True)
    scheduled_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    status_reason = models.CharField(max_length=250, blank=True)
    idempotency_key = models.CharField(max_length=100, null=True, blank=True, default=None)

    class Meta:
        ordering = ["-creado_en"]
        constraints = [models.UniqueConstraint(fields=["clinic", "nurse", "idempotency_key"], name="unique_nursing_round_operation")]
        indexes = [
            models.Index(fields=["clinic", "creado_en"]),
            models.Index(fields=["hospitalization", "creado_en"]),
            models.Index(fields=["patient", "creado_en"]),
            models.Index(fields=["round_type", "status"]),
        ]

    def clean(self):
        if self.hospitalization_id:
            if not self.hospitalization.is_active:
                raise ValidationError("No se puede crear una ronda en una hospitalizacion cerrada.")
            if self.clinic_id and self.hospitalization.clinic_id != self.clinic_id:
                raise ValidationError("La ronda debe pertenecer a la misma clinica del internamiento.")
            if self.patient_id and self.hospitalization.patient_id != self.patient_id:
                raise ValidationError("La ronda debe pertenecer al mismo paciente del internamiento.")
        if self.pain_level is not None and (self.pain_level < 0 or self.pain_level > 10):
            raise ValidationError({"pain_level": "El nivel de dolor debe estar entre 0 y 10."})
        if self.status in [self.Status.MISSED, self.Status.CANCELLED] and not self.status_reason.strip():
            raise ValidationError({"status_reason": "El motivo es obligatorio."})

    def save(self, *args, **kwargs):
        if self.hospitalization_id:
            self.clinic = self.hospitalization.clinic
            self.patient = self.hospitalization.patient
        if self.status == self.Status.COMPLETED and not self.completed_at:
            self.completed_at = timezone.now()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"Ronda {self.get_round_type_display()} - {self.patient}"


class MedicationAdministration(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pendiente"
        ADMINISTERED = "administered", "Administrado"
        OMITTED = "omitted", "Omitido"
        DELAYED = "delayed", "Retrasado"
        CANCELLED = "cancelled", "Cancelado"

    class Route(models.TextChoices):
        ORAL = "oral", "Oral"
        IV = "iv", "Intravenosa"
        IM = "im", "Intramuscular"
        SC = "sc", "Subcutanea"
        TOPICAL = "topical", "Topica"
        INHALED = "inhaled", "Inhalada"
        OTHER = "other", "Otra"

    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.PROTECT, related_name="medication_administrations")
    hospitalization = models.ForeignKey(Hospitalization, on_delete=models.CASCADE, related_name="medication_administrations")
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT, related_name="medication_administrations")
    prescription = models.ForeignKey("prescriptions.Prescription", on_delete=models.SET_NULL, null=True, blank=True, related_name="medication_administrations")
    prescription_item = models.ForeignKey("prescriptions.PrescriptionItem", on_delete=models.SET_NULL, null=True, blank=True, related_name="medication_administrations")
    medication_name = models.CharField(max_length=180)
    dosage = models.CharField(max_length=120)
    route = models.CharField(max_length=30, choices=Route.choices, default=Route.ORAL)
    scheduled_time = models.DateTimeField(null=True, blank=True)
    administered_time = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.PENDING)
    administered_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="medication_administrations_done")
    notes = models.TextField(blank=True)
    omission_reason = models.TextField(blank=True)

    class Meta:
        ordering = ["scheduled_time", "-creado_en"]
        indexes = [
            models.Index(fields=["clinic", "status", "scheduled_time"]),
            models.Index(fields=["hospitalization", "status"]),
            models.Index(fields=["patient", "status"]),
        ]

    def clean(self):
        if self.hospitalization_id:
            if self.clinic_id and self.hospitalization.clinic_id != self.clinic_id:
                raise ValidationError("El medicamento debe pertenecer a la misma clinica del internamiento.")
            if self.patient_id and self.hospitalization.patient_id != self.patient_id:
                raise ValidationError("El medicamento debe pertenecer al mismo paciente del internamiento.")
        if self.prescription_id and self.prescription.clinic_id != self.clinic_id:
            raise ValidationError("La receta debe pertenecer a la misma clinica.")
        if self.prescription_item_id and self.prescription_item.prescription_id != self.prescription_id:
            raise ValidationError("El item de receta no pertenece a la receta seleccionada.")
        if not self.medication_name:
            raise ValidationError({"medication_name": "El medicamento es obligatorio."})
        if not self.dosage:
            raise ValidationError({"dosage": "La dosis es obligatoria."})
        if self.status == self.Status.OMITTED and not self.omission_reason:
            raise ValidationError({"omission_reason": "El motivo de omision es obligatorio."})
        if self.status == self.Status.ADMINISTERED and (not self.administered_time or not self.administered_by_id):
            raise ValidationError("Medicamento administrado requiere hora y enfermera responsable.")

    def save(self, *args, **kwargs):
        if self.hospitalization_id:
            self.clinic = self.hospitalization.clinic
            self.patient = self.hospitalization.patient
        if self.prescription_item_id:
            self.medication_name = self.medication_name or self.prescription_item.medication_name
            self.dosage = self.dosage or self.prescription_item.dosage
            self.route = self.route or self.prescription_item.route
            self.prescription = self.prescription_item.prescription
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.medication_name} - {self.get_status_display()}"
