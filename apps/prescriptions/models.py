import re
import unicodedata

from django.core.exceptions import ObjectDoesNotExist, ValidationError
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


ALLERGY_NEGATIONS = {"", "no", "ninguna", "ninguno", "n/a", "na", "sin alergias", "no refiere", "desconocido"}
ALLERGY_STOPWORDS = {"alergia", "alergias", "alergico", "alergica", "a", "al", "la", "el", "los", "las", "de", "del", "por", "medicamento", "medicamentos", "refiere"}
ALLERGY_ALIASES = {
    "penicilina": {"penicilina", "amoxicilina", "ampicilina", "dicloxacilina"},
    "aines": {"ibuprofeno", "naproxeno", "diclofenaco", "ketorolaco", "aspirina"},
}


def normalize_medical_text(value):
    normalized = unicodedata.normalize("NFKD", str(value or "").lower())
    without_accents = "".join(char for char in normalized if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", " ", without_accents).strip()


def allergy_terms(allergy_text):
    normalized = normalize_medical_text(allergy_text)
    if normalized in ALLERGY_NEGATIONS:
        return set()
    terms = {part.strip() for part in re.split(r"[,;|/\n]+", allergy_text or "") if part.strip()}
    words = normalize_medical_text(allergy_text).split()
    terms.update(word for word in words if len(word) >= 4 and word not in ALLERGY_STOPWORDS)
    return {normalize_medical_text(term) for term in terms if normalize_medical_text(term) not in ALLERGY_NEGATIONS}


def find_allergy_conflicts(patient, medication_name):
    medication = normalize_medical_text(medication_name)
    if not patient or not medication:
        return []
    try:
        record = getattr(patient, "medical_record", None)
    except ObjectDoesNotExist:
        record = None
    raw_allergies = " ".join(filter(None, [getattr(patient, "alergias", ""), getattr(record, "allergies", "")]))
    conflicts = []
    for term in allergy_terms(raw_allergies):
        aliases = ALLERGY_ALIASES.get(term, {term})
        for alias in aliases:
            normalized_alias = normalize_medical_text(alias)
            if normalized_alias and (normalized_alias in medication or medication in normalized_alias):
                conflicts.append(term)
                break
    return sorted(set(conflicts))


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

    class Type(models.TextChoices):
        UNICA = "unica", "Unica"
        REPETIBLE = "repetible", "Repetible"

    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.PROTECT, related_name="prescriptions")
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT, related_name="prescriptions")
    doctor = models.ForeignKey("doctors.DoctorProfile", on_delete=models.PROTECT, related_name="prescriptions")
    consultation = models.ForeignKey("medical_records.ClinicalConsultation", on_delete=models.CASCADE, related_name="prescriptions")
    prescription_number = models.CharField(max_length=30)
    issue_date = models.DateField(default=timezone.localdate)
    general_instructions = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.BORRADOR)
    prescription_type = models.CharField(max_length=20, choices=Type.choices, default=Type.UNICA)
    max_dispenses = models.PositiveSmallIntegerField(null=True, blank=True)
    refill_interval_days = models.PositiveSmallIntegerField(null=True, blank=True)
    expires_at = models.DateField(null=True, blank=True)
    dispenses_used = models.PositiveSmallIntegerField(default=0)
    issued_at = models.DateTimeField(null=True, blank=True)
    issued_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="issued_prescriptions")
    void_reason = models.TextField(blank=True)
    voided_at = models.DateTimeField(null=True, blank=True)
    voided_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="voided_prescriptions")
    allergy_reviewed_at = models.DateTimeField(null=True, blank=True)
    allergy_reviewed_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="allergy_reviewed_prescriptions")
    allergy_override_reason = models.TextField(blank=True)
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
        if self.prescription_type == self.Type.REPETIBLE:
            if not self.max_dispenses or self.max_dispenses < 2:
                raise ValidationError("Una receta repetible requiere al menos dos dispensaciones autorizadas.")
            if self.dispenses_used > self.max_dispenses:
                raise ValidationError("Las dispensaciones utilizadas no pueden superar el maximo autorizado.")
        elif self.max_dispenses not in (None, 1):
            raise ValidationError("Una receta unica no puede autorizar multiples dispensaciones.")
        if self.expires_at and self.expires_at < self.issue_date:
            raise ValidationError("La fecha de vencimiento no puede ser anterior a la fecha de emision.")

    def save(self, *args, **kwargs):
        if self.consultation_id:
            self.clinic = self.consultation.clinic
            self.patient = self.consultation.patient
            self.doctor = self.consultation.doctor
        if self.clinic_id and not self.prescription_number:
            self.prescription_number = self.next_prescription_number(self.clinic)
        if self.pk:
            previous = Prescription.objects.filter(pk=self.pk).first()
            if previous and previous.status == self.Status.EMITIDA and self.status != self.Status.ANULADA:
                immutable_fields = [
                    "clinic_id", "patient_id", "doctor_id", "consultation_id", "prescription_number",
                    "issue_date", "general_instructions", "prescription_type", "max_dispenses",
                    "refill_interval_days", "expires_at",
                ]
                if any(getattr(previous, field) != getattr(self, field) for field in immutable_fields):
                    raise ValidationError("No puedes modificar una receta emitida.")
        self.full_clean()
        return super().save(*args, **kwargs)

    def issue(self, user=None, confirm_allergies=False, allergy_override_reason=""):
        if self.status == self.Status.EMITIDA:
            raise ValidationError("La receta ya fue emitida.")
        if self.status == self.Status.ANULADA:
            raise ValidationError("No se puede emitir una receta anulada.")
        if self.consultation.status != ClinicalConsultation.Status.BORRADOR:
            raise ValidationError("Solo puedes emitir recetas desde una consulta activa.")
        if not self.items.filter(activo=True).exists():
            raise ValidationError("No puedes emitir una receta sin medicamentos.")
        conflicts = []
        for item in self.items.filter(activo=True):
            conflicts.extend(find_allergy_conflicts(self.patient, item.medication_name))
        if conflicts:
            substances = ", ".join(sorted(set(conflicts)))
            if not confirm_allergies:
                raise ValidationError(f"Este paciente tiene una alergia registrada relacionada con el medicamento seleccionado: {substances}.")
            if len((allergy_override_reason or "").strip()) < 8:
                raise ValidationError("Confirma la alerta e ingresa una justificacion clinica de al menos 8 caracteres.")
            self.allergy_reviewed_at = timezone.now()
            self.allergy_reviewed_by = user
            self.allergy_override_reason = allergy_override_reason.strip()
        self.status = self.Status.EMITIDA
        self.issue_date = timezone.localdate()
        self.issued_at = timezone.now()
        self.issued_by = user
        self.save(update_fields=[
            "status", "issue_date", "issued_at", "issued_by", "allergy_reviewed_at",
            "allergy_reviewed_by", "allergy_override_reason", "actualizado_en",
        ])

    def void(self, user=None, reason=""):
        if self.status == self.Status.ANULADA:
            raise ValidationError("La receta ya esta anulada.")
        if len((reason or "").strip()) < 5:
            raise ValidationError("El motivo de anulacion debe tener al menos 5 caracteres.")
        self.status = self.Status.ANULADA
        self.activo = False
        self.void_reason = reason.strip()
        self.voided_at = timezone.now()
        self.voided_by = user
        self.save(update_fields=["status", "activo", "void_reason", "voided_at", "voided_by", "actualizado_en"])

    def delete(self, *args, **kwargs):
        if self.status in [self.Status.EMITIDA, self.Status.ANULADA]:
            raise ValidationError("Las recetas emitidas o anuladas no pueden eliminarse.")
        return super().delete(*args, **kwargs)

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
        if self.prescription_id and self.prescription.status != Prescription.Status.BORRADOR:
            raise ValidationError("No puedes modificar medicamentos de una receta emitida.")
        if self.quantity:
            try:
                from decimal import Decimal

                if Decimal(self.quantity) <= 0:
                    raise ValidationError("La cantidad debe ser mayor que cero.")
            except (ValueError, TypeError, ArithmeticError):
                raise ValidationError("La cantidad debe ser un numero positivo.")

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        if self.prescription.status != Prescription.Status.BORRADOR:
            raise ValidationError("No puedes eliminar medicamentos de una receta emitida o anulada.")
        return super().delete(*args, **kwargs)

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
        EN_PROCESO = "en_proceso", "En proceso"
        COMPLETADA = "completada", "Completada"
        REVISADA = "revisada", "Revisada"
        CANCELADA = "cancelada", "Cancelada"
        VENCIDA = "vencida", "Vencida"

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
    expires_at = models.DateTimeField(null=True, blank=True)
    scheduled_at = models.DateTimeField(null=True, blank=True)
    responsible_user = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="assigned_medical_orders")
    execution_area = models.CharField(max_length=120, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    result_summary = models.TextField(blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="reviewed_medical_orders")
    review_notes = models.TextField(blank=True)
    cancellation_reason = models.TextField(blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="cancelled_medical_orders")
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
        if self.responsible_user_id and self.responsible_user.clinica_id != self.clinic_id:
            raise ValidationError("El responsable debe pertenecer a la misma clinica.")
        if self.expires_at and self.creado_en and self.expires_at <= self.creado_en:
            raise ValidationError("El vencimiento debe ser posterior a la creacion de la orden.")
        if self.status in [self.Status.COMPLETADA, self.Status.REVISADA] and not self.result_summary.strip():
            raise ValidationError("Una orden completada requiere un resultado resumido.")

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

    def delete(self, *args, **kwargs):
        raise ValidationError("Las ordenes medicas no pueden eliminarse; deben cancelarse.")

    @property
    def is_expired(self):
        return bool(self.expires_at and self.expires_at <= timezone.now() and self.status not in [self.Status.COMPLETADA, self.Status.REVISADA, self.Status.CANCELADA])

    def start(self, user):
        if self.is_expired or self.status == self.Status.VENCIDA:
            raise ValidationError("La orden medica esta vencida.")
        if self.status != self.Status.PENDIENTE:
            raise ValidationError("Solo una orden pendiente puede iniciarse.")
        if getattr(user, "clinica_id", None) != self.clinic_id:
            raise ValidationError("El responsable debe pertenecer a la misma clinica.")
        self.status = self.Status.EN_PROCESO
        self.responsible_user = user
        self.started_at = timezone.now()
        self.save(update_fields=["status", "responsible_user", "started_at", "actualizado_en"])

    def complete(self, user, result_summary):
        if self.status != self.Status.EN_PROCESO:
            raise ValidationError("Solo una orden en proceso puede completarse.")
        if self.responsible_user_id and self.responsible_user_id != user.id:
            raise ValidationError("Solo el responsable asignado puede completar la orden.")
        if len((result_summary or "").strip()) < 3:
            raise ValidationError("Registra un resultado resumido para completar la orden.")
        self.responsible_user = self.responsible_user or user
        self.result_summary = result_summary.strip()
        self.completed_at = timezone.now()
        self.status = self.Status.COMPLETADA
        self.save(update_fields=["responsible_user", "result_summary", "completed_at", "status", "actualizado_en"])

    def review(self, user, notes=""):
        if self.status != self.Status.COMPLETADA:
            raise ValidationError("Solo una orden completada puede marcarse como revisada.")
        if self.doctor.user_id != user.id:
            raise ValidationError("Solo el medico que emitio la orden puede revisarla.")
        self.status = self.Status.REVISADA
        self.reviewed_at = timezone.now()
        self.reviewed_by = user
        self.review_notes = (notes or "").strip()
        self.save(update_fields=["status", "reviewed_at", "reviewed_by", "review_notes", "actualizado_en"])

    def cancel(self, user, reason):
        if self.status in [self.Status.COMPLETADA, self.Status.REVISADA]:
            raise ValidationError("No puedes cancelar una orden completada o revisada.")
        if self.status == self.Status.CANCELADA:
            raise ValidationError("La orden ya esta cancelada.")
        if len((reason or "").strip()) < 5:
            raise ValidationError("El motivo de cancelacion debe tener al menos 5 caracteres.")
        self.status = self.Status.CANCELADA
        self.activo = False
        self.cancellation_reason = reason.strip()
        self.cancelled_at = timezone.now()
        self.cancelled_by = user
        self.save(update_fields=["status", "activo", "cancellation_reason", "cancelled_at", "cancelled_by", "actualizado_en"])
