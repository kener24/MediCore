from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from apps.clinic_settings.utils import clinic_prefix, next_sequence_number
from apps.core.models import TimeStampedModel
from apps.medical_records.models import MedicalRecord


class PatientVisit(TimeStampedModel):
    class VisitType(models.TextChoices):
        WALK_IN = "walk_in", "Sin cita"
        APPOINTMENT = "appointment", "Cita"
        EMERGENCY = "emergency", "Emergencia"
        FOLLOW_UP = "follow_up", "Seguimiento"
        CONTROL = "control", "Control"
        PROCEDURE = "procedure", "Procedimiento"

    class Priority(models.TextChoices):
        NORMAL = "normal", "Normal"
        PRIORITY = "priority", "Prioritario"
        URGENT = "urgent", "Urgente"
        EMERGENCY = "emergency", "Emergencia"

    class Status(models.TextChoices):
        REGISTERED = "registered", "Registrado"
        WAITING_TRIAGE = "waiting_triage", "Esperando triaje"
        IN_TRIAGE = "in_triage", "En triaje"
        WAITING_DOCTOR = "waiting_doctor", "Esperando doctor"
        IN_CONSULTATION = "in_consultation", "En consulta"
        CONSULTATION_FINISHED = "consultation_finished", "Consulta finalizada"
        WAITING_BILLING = "waiting_billing", "Pendiente de cobro"
        WAITING_PAYMENT = "waiting_payment", "Pendiente de pago"
        PAID = "paid", "Pagado"
        COMPLETED = "completed", "Completado"
        CANCELLED = "cancelled", "Cancelado"
        NO_SHOW = "no_show", "No asistio"

    ACTIVE_STATUSES = [
        Status.REGISTERED,
        Status.WAITING_TRIAGE,
        Status.IN_TRIAGE,
        Status.WAITING_DOCTOR,
        Status.IN_CONSULTATION,
        Status.CONSULTATION_FINISHED,
        Status.WAITING_BILLING,
        Status.WAITING_PAYMENT,
        Status.PAID,
    ]

    class Origin(models.TextChoices):
        RECEPTION = "reception", "Recepcion"
        PATIENT_PORTAL = "patient_portal", "Portal paciente"
        DOCTOR = "doctor", "Medico"
        IMPORT = "import", "Importacion"

    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.PROTECT, related_name="patient_visits")
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT, related_name="visits")
    appointment = models.ForeignKey("appointments.Appointment", on_delete=models.SET_NULL, null=True, blank=True, related_name="visits")
    medical_record = models.ForeignKey("medical_records.MedicalRecord", on_delete=models.PROTECT, related_name="visits")
    consultation = models.ForeignKey("medical_records.ClinicalConsultation", on_delete=models.SET_NULL, null=True, blank=True, related_name="patient_visits")
    invoice = models.ForeignKey("billing.Invoice", on_delete=models.SET_NULL, null=True, blank=True, related_name="patient_visits")
    visit_number = models.CharField(max_length=30)
    visit_date = models.DateField(default=timezone.localdate)
    arrival_time = models.DateTimeField(default=timezone.now)
    triage_started_at = models.DateTimeField(null=True, blank=True)
    triage_completed_at = models.DateTimeField(null=True, blank=True)
    consultation_started_at = models.DateTimeField(null=True, blank=True)
    consultation_completed_at = models.DateTimeField(null=True, blank=True)
    billing_started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    checkout_at = models.DateTimeField(null=True, blank=True)
    visit_type = models.CharField(max_length=30, choices=VisitType.choices, default=VisitType.WALK_IN)
    origin = models.CharField(max_length=30, choices=Origin.choices, default=Origin.RECEPTION)
    priority = models.CharField(max_length=30, choices=Priority.choices, default=Priority.NORMAL)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.WAITING_TRIAGE)
    reason = models.CharField(max_length=250)
    symptoms = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    cancellation_reason = models.TextField(blank=True)
    assigned_doctor = models.ForeignKey("doctors.DoctorProfile", on_delete=models.SET_NULL, null=True, blank=True, related_name="assigned_visits")
    assigned_nurse = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="assigned_triage_visits")
    created_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="visits_created")
    checked_in_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="visits_checked_in")
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-visit_date", "-arrival_time"]
        indexes = [
            models.Index(fields=["clinic", "visit_date"]),
            models.Index(fields=["patient", "visit_date"]),
            models.Index(fields=["status"]),
            models.Index(fields=["priority"]),
            models.Index(fields=["assigned_doctor", "status"]),
        ]
        constraints = [models.UniqueConstraint(fields=["clinic", "visit_number"], name="unique_visit_number_per_clinic")]

    @classmethod
    def next_visit_number(cls, clinic):
        prefix = clinic_prefix(clinic, "visit_prefix", "VIS")
        return next_sequence_number(cls, clinic, "visit_number", prefix)

    def clean(self):
        if self.patient_id and self.clinic_id and self.patient.clinic_id != self.clinic_id:
            raise ValidationError("El paciente debe pertenecer a la misma clinica.")
        if self.medical_record_id and self.medical_record.patient_id != self.patient_id:
            raise ValidationError("El expediente debe pertenecer al paciente.")
        if self.appointment_id:
            if self.appointment.clinic_id != self.clinic_id or self.appointment.patient_id != self.patient_id:
                raise ValidationError("La cita debe pertenecer al mismo paciente y clinica.")
        if self.assigned_doctor_id and self.assigned_doctor.clinic_id != self.clinic_id:
            raise ValidationError("El medico asignado debe pertenecer a la misma clinica.")
        if self.assigned_nurse_id and self.assigned_nurse.clinica_id != self.clinic_id:
            raise ValidationError("La enfermera asignada debe pertenecer a la misma clinica.")

    def save(self, *args, **kwargs):
        if self.patient_id and not self.clinic_id:
            self.clinic = self.patient.clinic
        if self.patient_id and not self.medical_record_id:
            self.medical_record, _ = MedicalRecord.objects.get_or_create(patient=self.patient, defaults={"clinic": self.patient.clinic})
        if self.clinic_id and not self.visit_number:
            self.visit_number = self.next_visit_number(self.clinic)
        self.full_clean()
        return super().save(*args, **kwargs)

    def touch_status(self, status, user=None):
        now = timezone.now()
        self.status = status
        if status == self.Status.IN_TRIAGE:
            self.triage_started_at = self.triage_started_at or now
            if user:
                self.assigned_nurse = user
        if status == self.Status.WAITING_DOCTOR:
            self.triage_completed_at = self.triage_completed_at or now
        if status == self.Status.IN_CONSULTATION:
            self.consultation_started_at = self.consultation_started_at or now
        if status in [self.Status.CONSULTATION_FINISHED, self.Status.WAITING_BILLING, self.Status.WAITING_PAYMENT]:
            self.consultation_completed_at = self.consultation_completed_at or now
        if status in [self.Status.WAITING_BILLING, self.Status.WAITING_PAYMENT]:
            self.billing_started_at = self.billing_started_at or now
        if status == self.Status.PAID:
            self.billing_started_at = self.billing_started_at or now
        if status == self.Status.COMPLETED:
            self.completed_at = self.completed_at or now
            self.checkout_at = self.checkout_at or now
            self.active = False
        if status in [self.Status.CANCELLED, self.Status.NO_SHOW]:
            self.cancelled_at = self.cancelled_at or now
            self.checkout_at = self.checkout_at or now
            self.active = False
        self.save()
