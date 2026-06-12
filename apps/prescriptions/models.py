from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from apps.clinic_settings.utils import clinic_prefix, next_sequence_number
from apps.core.models import TimeStampedModel
from apps.medical_records.models import ClinicalConsultation


def validate_consultation_links(consultation, patient, doctor, clinic):
    if consultation.status == ClinicalConsultation.Status.ANULADA:
        raise ValidationError("No se puede registrar informacion clinica en una consulta anulada.")
    if consultation.patient_id != patient.id or consultation.doctor_id != doctor.id:
        raise ValidationError("Paciente y medico deben coincidir con la consulta.")
    if clinic.id != consultation.clinic_id or patient.clinic_id != clinic.id or doctor.clinic_id != clinic.id:
        raise ValidationError("Consulta, paciente y medico deben pertenecer a la misma clinica.")


class Diagnosis(TimeStampedModel):
    class Type(models.TextChoices):
        PRESUNTIVO = "presuntivo", "Presuntivo"
        CONFIRMADO = "confirmado", "Confirmado"
        DIFERENCIAL = "diferencial", "Diferencial"

    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.PROTECT, related_name="diagnoses")
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT, related_name="diagnoses")
    doctor = models.ForeignKey("doctors.DoctorProfile", on_delete=models.PROTECT, related_name="diagnoses")
    consultation = models.ForeignKey("medical_records.ClinicalConsultation", on_delete=models.CASCADE, related_name="diagnoses")
    code = models.CharField(max_length=30, blank=True)
    name = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    diagnosis_type = models.CharField(max_length=20, choices=Type.choices, default=Type.PRESUNTIVO)
    is_primary = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["-is_primary", "name"]
        indexes = [
            models.Index(fields=["clinic", "patient"]),
            models.Index(fields=["consultation", "is_primary"]),
            models.Index(fields=["diagnosis_type"]),
        ]

    def clean(self):
        if self.consultation_id and self.patient_id and self.doctor_id and self.clinic_id:
            validate_consultation_links(self.consultation, self.patient, self.doctor, self.clinic)
        if self.is_primary and self.consultation_id:
            qs = Diagnosis.objects.filter(consultation=self.consultation, is_primary=True, activo=True)
            if self.pk:
                qs = qs.exclude(pk=self.pk)
            if qs.exists():
                raise ValidationError("Solo puede existir un diagnostico principal por consulta.")

    def save(self, *args, **kwargs):
        if self.consultation_id:
            self.clinic = self.consultation.clinic
            self.patient = self.consultation.patient
            self.doctor = self.consultation.doctor
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Prescription(TimeStampedModel):
    class Status(models.TextChoices):
        BORRADOR = "borrador", "Borrador"
        EMITIDA = "emitida", "Emitida"
        ANULADA = "anulada", "Anulada"

    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.PROTECT, related_name="prescriptions")
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT, related_name="prescriptions")
    doctor = models.ForeignKey("doctors.DoctorProfile", on_delete=models.PROTECT, related_name="prescriptions")
    consultation = models.ForeignKey("medical_records.ClinicalConsultation", on_delete=models.CASCADE, related_name="prescriptions")
    prescription_number = models.CharField(max_length=30)
    issue_date = models.DateField(default=timezone.localdate)
    general_instructions = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.BORRADOR)
    void_reason = models.TextField(blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["-issue_date", "-creado_en"]
        constraints = [
            models.UniqueConstraint(fields=["clinic", "prescription_number"], name="unique_prescription_number_per_clinic"),
        ]
        indexes = [
            models.Index(fields=["clinic", "prescription_number"]),
            models.Index(fields=["patient", "issue_date"]),
            models.Index(fields=["doctor", "issue_date"]),
            models.Index(fields=["status"]),
        ]

    @classmethod
    def next_prescription_number(cls, clinic):
        prefix = clinic_prefix(clinic, "prescription_prefix", "RX")
        return next_sequence_number(cls, clinic, "prescription_number", prefix)

    def clean(self):
        if self.consultation_id and self.patient_id and self.doctor_id and self.clinic_id:
            validate_consultation_links(self.consultation, self.patient, self.doctor, self.clinic)

    def save(self, *args, **kwargs):
        if self.consultation_id:
            self.clinic = self.consultation.clinic
            self.patient = self.consultation.patient
            self.doctor = self.consultation.doctor
        if self.clinic_id and not self.prescription_number:
            self.prescription_number = self.next_prescription_number(self.clinic)
        self.full_clean()
        return super().save(*args, **kwargs)

    def issue(self):
        if self.status == self.Status.ANULADA:
            raise ValidationError("No se puede emitir una receta anulada.")
        if not self.items.filter(activo=True).exists():
            raise ValidationError("No puedes emitir una receta sin medicamentos.")
        self.status = self.Status.EMITIDA
        self.issue_date = timezone.localdate()
        self.save(update_fields=["status", "issue_date", "actualizado_en"])

    def __str__(self):
        return self.prescription_number


class PrescriptionItem(TimeStampedModel):
    class Route(models.TextChoices):
        ORAL = "oral", "Oral"
        INTRAVENOSA = "intravenosa", "Intravenosa"
        INTRAMUSCULAR = "intramuscular", "Intramuscular"
        SUBCUTANEA = "subcutanea", "Subcutanea"
        TOPICA = "topica", "Topica"
        INHALADA = "inhalada", "Inhalada"
        OFTALMICA = "oftalmica", "Oftalmica"
        OTICA = "otica", "Otica"
        NASAL = "nasal", "Nasal"
        OTRA = "otra", "Otra"

    prescription = models.ForeignKey(Prescription, on_delete=models.CASCADE, related_name="items")
    medication_name = models.CharField(max_length=180)
    presentation = models.CharField(max_length=120, blank=True)
    dosage = models.CharField(max_length=120)
    frequency = models.CharField(max_length=120)
    duration = models.CharField(max_length=120, blank=True)
    quantity = models.CharField(max_length=80, blank=True)
    route = models.CharField(max_length=30, choices=Route.choices, default=Route.ORAL)
    instructions = models.TextField(blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["id"]

    def clean(self):
        if not self.medication_name or not self.dosage or not self.frequency:
            raise ValidationError("Medicamento, dosis y frecuencia son obligatorios.")
        if self.prescription_id and self.prescription.status == Prescription.Status.EMITIDA:
            raise ValidationError("No puedes modificar medicamentos de una receta emitida.")

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return self.medication_name


class MedicalOrder(TimeStampedModel):
    class Type(models.TextChoices):
        LABORATORIO = "laboratorio", "Laboratorio"
        IMAGENOLOGIA = "imagenologia", "Imagenologia"
        PROCEDIMIENTO = "procedimiento", "Procedimiento"
        INTERCONSULTA = "interconsulta", "Interconsulta"
        OTRO = "otro", "Otro"

    class Priority(models.TextChoices):
        BAJA = "baja", "Baja"
        NORMAL = "normal", "Normal"
        ALTA = "alta", "Alta"
        URGENTE = "urgente", "Urgente"

    class Status(models.TextChoices):
        PENDIENTE = "pendiente", "Pendiente"
        COMPLETADA = "completada", "Completada"
        CANCELADA = "cancelada", "Cancelada"

    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.PROTECT, related_name="medical_orders")
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT, related_name="medical_orders")
    doctor = models.ForeignKey("doctors.DoctorProfile", on_delete=models.PROTECT, related_name="medical_orders")
    consultation = models.ForeignKey("medical_records.ClinicalConsultation", on_delete=models.CASCADE, related_name="medical_orders")
    order_number = models.CharField(max_length=30)
    order_type = models.CharField(max_length=30, choices=Type.choices, default=Type.LABORATORIO)
    title = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    instructions = models.TextField(blank=True)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.NORMAL)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDIENTE)
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["-creado_en"]
        constraints = [
            models.UniqueConstraint(fields=["clinic", "order_number"], name="unique_order_number_per_clinic"),
        ]
        indexes = [
            models.Index(fields=["clinic", "order_number"]),
            models.Index(fields=["patient", "creado_en"]),
            models.Index(fields=["doctor", "creado_en"]),
            models.Index(fields=["order_type"]),
            models.Index(fields=["status"]),
        ]

    @classmethod
    def next_order_number(cls, clinic):
        prefix = clinic_prefix(clinic, "medical_order_prefix", "OM")
        return next_sequence_number(cls, clinic, "order_number", prefix)

    def clean(self):
        if self.consultation_id and self.patient_id and self.doctor_id and self.clinic_id:
            validate_consultation_links(self.consultation, self.patient, self.doctor, self.clinic)

    def save(self, *args, **kwargs):
        if self.consultation_id:
            self.clinic = self.consultation.clinic
            self.patient = self.consultation.patient
            self.doctor = self.consultation.doctor
        if self.clinic_id and not self.order_number:
            self.order_number = self.next_order_number(self.clinic)
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return self.order_number
