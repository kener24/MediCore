from django.core.exceptions import ValidationError
from django.db import models

from apps.core.models import TimeStampedModel
from apps.documents.utils import clinical_document_upload_to


class DocumentCategory(TimeStampedModel):
    class Type(models.TextChoices):
        CLINICAL = "clinical", "Clinico"
        ADMINISTRATIVE = "administrative", "Administrativo"
        BILLING = "billing", "Facturacion"
        IDENTITY = "identity", "Identidad"
        CONSENT = "consent", "Consentimiento"
        LAB_RESULT = "lab_result", "Resultado laboratorio"
        IMAGING = "imaging", "Imagen medica"
        PRESCRIPTION = "prescription", "Receta"
        MEDICAL_ORDER = "medical_order", "Orden medica"
        OTHER = "other", "Otro"

    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.CASCADE, null=True, blank=True, related_name="document_categories")
    name = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    document_type = models.CharField(max_length=30, choices=Type.choices, default=Type.OTHER)
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["document_type", "name"]
        constraints = [
            models.UniqueConstraint(fields=["clinic", "name", "document_type"], name="unique_document_category_per_clinic_type"),
            models.UniqueConstraint(fields=["name", "document_type"], condition=models.Q(clinic__isnull=True), name="unique_global_document_category_type"),
        ]

    def __str__(self):
        scope = self.clinic.nombre if self.clinic_id else "Global"
        return f"{self.name} ({scope})"


class ClinicalDocument(TimeStampedModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Activo"
        ARCHIVED = "archived", "Archivado"
        DELETED = "deleted", "Eliminado"

    class StorageBackend(models.TextChoices):
        LOCAL = "local", "Local"
        S3 = "s3", "S3"
        EXTERNAL = "external", "Externo"

    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.PROTECT, related_name="clinical_documents")
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT, related_name="clinical_documents")
    medical_record = models.ForeignKey("medical_records.MedicalRecord", on_delete=models.SET_NULL, null=True, blank=True, related_name="documents")
    consultation = models.ForeignKey("medical_records.ClinicalConsultation", on_delete=models.SET_NULL, null=True, blank=True, related_name="documents")
    appointment = models.ForeignKey("appointments.Appointment", on_delete=models.SET_NULL, null=True, blank=True, related_name="documents")
    prescription = models.ForeignKey("prescriptions.Prescription", on_delete=models.SET_NULL, null=True, blank=True, related_name="documents")
    medical_order = models.ForeignKey("prescriptions.MedicalOrder", on_delete=models.SET_NULL, null=True, blank=True, related_name="documents")
    invoice = models.ForeignKey("billing.Invoice", on_delete=models.SET_NULL, null=True, blank=True, related_name="documents")
    category = models.ForeignKey(DocumentCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name="documents")
    title = models.CharField(max_length=220)
    description = models.TextField(blank=True)
    file = models.FileField(upload_to=clinical_document_upload_to)
    original_filename = models.CharField(max_length=255)
    file_type = models.CharField(max_length=80, blank=True)
    mime_type = models.CharField(max_length=120, blank=True)
    file_size = models.PositiveBigIntegerField(default=0)
    file_extension = models.CharField(max_length=20, blank=True)
    storage_backend = models.CharField(max_length=20, choices=StorageBackend.choices, default=StorageBackend.LOCAL)
    uploaded_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="uploaded_documents")
    visible_to_patient = models.BooleanField(default=False)
    is_sensitive = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    version = models.PositiveIntegerField(default=1)
    replaced_by = models.ForeignKey("self", on_delete=models.SET_NULL, null=True, blank=True, related_name="previous_versions")
    checksum = models.CharField(max_length=64, blank=True)
    tags = models.JSONField(default=list, blank=True)
    notes = models.TextField(blank=True)
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-creado_en"]
        indexes = [
            models.Index(fields=["clinic", "patient", "status"]),
            models.Index(fields=["category", "creado_en"]),
            models.Index(fields=["visible_to_patient", "status"]),
            models.Index(fields=["is_sensitive"]),
            models.Index(fields=["uploaded_by"]),
        ]

    def clean(self):
        if self.patient_id and self.clinic_id and self.patient.clinic_id != self.clinic_id:
            raise ValidationError("El paciente debe pertenecer a la misma clinica.")
        related = [
            ("medical_record", self.medical_record),
            ("consultation", self.consultation),
            ("appointment", self.appointment),
            ("prescription", self.prescription),
            ("medical_order", self.medical_order),
            ("invoice", self.invoice),
        ]
        for label, obj in related:
            if not obj:
                continue
            if getattr(obj, "clinic_id", None) != self.clinic_id:
                raise ValidationError(f"{label} debe pertenecer a la misma clinica.")
            if getattr(obj, "patient_id", None) and obj.patient_id != self.patient_id:
                raise ValidationError(f"{label} debe pertenecer al mismo paciente.")
        if self.category_id and self.category.clinic_id and self.category.clinic_id != self.clinic_id:
            raise ValidationError("La categoria debe ser global o de la misma clinica.")
        if self.status == self.Status.DELETED:
            self.active = False

    def save(self, *args, **kwargs):
        if self.patient_id and not self.clinic_id:
            self.clinic = self.patient.clinic
        self.full_clean()
        return super().save(*args, **kwargs)

    @property
    def document_type(self):
        return self.category.document_type if self.category_id else DocumentCategory.Type.OTHER

    def __str__(self):
        return f"{self.title} - {self.patient}"
