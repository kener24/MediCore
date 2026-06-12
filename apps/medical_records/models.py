from decimal import Decimal, ROUND_HALF_UP

from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.utils import timezone

from apps.appointments.models import Appointment
from apps.clinic_settings.utils import clinic_prefix, next_sequence_number
from apps.core.models import TimeStampedModel


class MedicalRecord(TimeStampedModel):
    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.PROTECT, related_name="medical_records")
    patient = models.OneToOneField("patients.Patient", on_delete=models.PROTECT, related_name="medical_record")
    record_number = models.CharField(max_length=30)
    blood_type = models.CharField(max_length=20, blank=True)
    allergies = models.TextField(blank=True)
    chronic_diseases = models.TextField(blank=True)
    surgical_history = models.TextField(blank=True)
    family_history = models.TextField(blank=True)
    current_medications = models.TextField(blank=True)
    general_notes = models.TextField(blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["record_number"]
        constraints = [
            models.UniqueConstraint(fields=["clinic", "record_number"], name="unique_record_number_per_clinic"),
        ]
        indexes = [
            models.Index(fields=["clinic", "record_number"]),
            models.Index(fields=["patient"]),
            models.Index(fields=["activo"]),
        ]

    def clean(self):
        if self.patient_id:
            if self.clinic_id and self.clinic_id != self.patient.clinic_id:
                raise ValidationError("El expediente debe pertenecer a la misma clinica del paciente.")

    @classmethod
    def next_record_number(cls, clinic):
        prefix = clinic_prefix(clinic, "medical_record_prefix", "EXP")
        return next_sequence_number(cls, clinic, "record_number", prefix)

    def save(self, *args, **kwargs):
        if self.patient_id and not self.clinic_id:
            self.clinic = self.patient.clinic
        if self.patient_id and not self.blood_type:
            self.blood_type = self.patient.tipo_sangre
        if self.patient_id and not self.allergies:
            self.allergies = self.patient.alergias
        if self.patient_id and not self.chronic_diseases:
            self.chronic_diseases = self.patient.enfermedades_cronicas
        if self.clinic_id and not self.record_number:
            self.record_number = self.next_record_number(self.clinic)
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.record_number} - {self.patient.nombre_completo}"


class ClinicalConsultation(TimeStampedModel):
    class Status(models.TextChoices):
        BORRADOR = "borrador", "Borrador"
        FINALIZADA = "finalizada", "Finalizada"
        ANULADA = "anulada", "Anulada"

    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.PROTECT, related_name="consultations")
    medical_record = models.ForeignKey(MedicalRecord, on_delete=models.PROTECT, related_name="consultations")
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT, related_name="consultations")
    doctor = models.ForeignKey("doctors.DoctorProfile", on_delete=models.PROTECT, related_name="consultations")
    appointment = models.OneToOneField("appointments.Appointment", on_delete=models.SET_NULL, null=True, blank=True, related_name="consultation")
    patient_visit = models.ForeignKey("admissions.PatientVisit", on_delete=models.SET_NULL, null=True, blank=True, related_name="consultations")
    consultation_date = models.DateField(default=timezone.localdate)
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    chief_complaint = models.TextField(blank=True)
    symptoms = models.TextField(blank=True)
    physical_exam = models.TextField(blank=True)
    clinical_assessment = models.TextField(blank=True)
    preliminary_diagnosis = models.TextField(blank=True)
    treatment_plan = models.TextField(blank=True)
    recommendations = models.TextField(blank=True)
    private_notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.BORRADOR)
    void_reason = models.TextField(blank=True)
    created_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="consultations_created")
    finalized_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="consultations_finalized")
    finalized_at = models.DateTimeField(null=True, blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["-consultation_date", "-start_time", "-creado_en"]
        indexes = [
            models.Index(fields=["clinic", "consultation_date"]),
            models.Index(fields=["patient", "consultation_date"]),
            models.Index(fields=["doctor", "consultation_date"]),
            models.Index(fields=["status"]),
        ]

    def clean(self):
        if self.patient_id and self.medical_record_id and self.medical_record.patient_id != self.patient_id:
            raise ValidationError("El expediente debe pertenecer al paciente de la consulta.")
        if self.patient_id and self.doctor_id and self.patient.clinic_id != self.doctor.clinic_id:
            raise ValidationError("Paciente y medico deben pertenecer a la misma clinica.")
        if self.clinic_id and self.patient_id and self.clinic_id != self.patient.clinic_id:
            raise ValidationError("La consulta debe pertenecer a la misma clinica del paciente.")
        if self.appointment_id:
            if self.appointment.status == Appointment.Status.CANCELADA:
                raise ValidationError("No puedes iniciar consulta desde una cita cancelada.")
            if self.appointment.patient_id != self.patient_id or self.appointment.doctor_id != self.doctor_id:
                raise ValidationError("La cita debe corresponder al mismo paciente y medico.")
        if self.end_time and self.start_time and self.start_time >= self.end_time:
            raise ValidationError("La hora inicial debe ser menor que la hora final.")
        if self.status == self.Status.FINALIZADA and (not self.chief_complaint or not self.clinical_assessment):
            raise ValidationError("Motivo de consulta y evaluacion clinica son obligatorios para finalizar.")

    def save(self, *args, **kwargs):
        if self.patient_id and not self.clinic_id:
            self.clinic = self.patient.clinic
        self.full_clean()
        return super().save(*args, **kwargs)

    def finalize(self, user):
        self.status = self.Status.FINALIZADA
        self.finalized_by = user
        self.finalized_at = timezone.now()
        self.activo = True
        self.save()
        if self.patient_visit_id:
            self.patient_visit.touch_status("waiting_billing", user=user)
        if self.appointment_id and self.appointment.status != Appointment.Status.ATENDIDA:
            self.appointment.status = Appointment.Status.ATENDIDA
            self.appointment.attended_at = timezone.now()
            self.appointment.save(update_fields=["status", "attended_at"])

    def __str__(self):
        return f"{self.patient.nombre_completo} - {self.consultation_date}"


class VitalSigns(TimeStampedModel):
    consultation = models.OneToOneField(ClinicalConsultation, on_delete=models.CASCADE, null=True, blank=True, related_name="vital_signs")
    patient_visit = models.ForeignKey("admissions.PatientVisit", on_delete=models.CASCADE, null=True, blank=True, related_name="vital_signs")
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
    registrado_por = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="vital_signs_registered")
    recorded_at = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name_plural = "Vital signs"

    def clean(self):
        ranges = [
            (self.temperature, Decimal("30"), Decimal("45"), "temperature"),
            (self.blood_pressure_systolic, 50, 260, "blood_pressure_systolic"),
            (self.blood_pressure_diastolic, 30, 160, "blood_pressure_diastolic"),
            (self.heart_rate, 20, 240, "heart_rate"),
            (self.respiratory_rate, 5, 80, "respiratory_rate"),
            (self.oxygen_saturation, 50, 100, "oxygen_saturation"),
            (self.weight, Decimal("1"), Decimal("400"), "weight"),
            (self.height, Decimal("0.30"), Decimal("2.50"), "height"),
            (self.glucose, 20, 700, "glucose"),
        ]
        if self.pain_scale is not None and (self.pain_scale < 0 or self.pain_scale > 10):
            errors["pain_scale"] = "La escala de dolor debe estar entre 0 y 10."
        if self.blood_pressure_systolic is not None and self.blood_pressure_systolic <= 0:
            errors["blood_pressure_systolic"] = "La presion sistolica debe ser positiva."
        if self.blood_pressure_diastolic is not None and self.blood_pressure_diastolic <= 0:
            errors["blood_pressure_diastolic"] = "La presion diastolica debe ser positiva."
        if not self.consultation_id and not self.patient_visit_id:
            errors["patient_visit"] = "Los signos vitales deben relacionarse a una visita o consulta."
        errors = {}
        for value, low, high, field in ranges:
            if value is not None and (value < low or value > high):
                errors[field] = "Valor fuera de rango clinico razonable."
        if errors:
            raise ValidationError(errors)

    def calculate_bmi(self):
        if self.weight and self.height:
            self.bmi = (self.weight / (self.height * self.height)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    def save(self, *args, **kwargs):
        self.calculate_bmi()
        self.full_clean()
        return super().save(*args, **kwargs)


class ClinicalSupplyUsage(TimeStampedModel):
    class UsageType(models.TextChoices):
        MEDICATION = "medication", "Medicamento"
        SUPPLY = "supply", "Insumo"
        PROCEDURE_SUPPLY = "procedure_supply", "Insumo de procedimiento"
        INJECTION = "injection", "Inyeccion"
        SERUM = "serum", "Suero"
        WOUND_CARE = "wound_care", "Curacion"
        NEBULIZATION = "nebulization", "Nebulizacion"
        OTHER = "other", "Otro"

    class Status(models.TextChoices):
        PENDING = "pending", "Pendiente"
        APPLIED = "applied", "Aplicado"
        CANCELLED = "cancelled", "Cancelado"
        INVOICED = "invoiced", "Facturado"

    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.PROTECT, related_name="clinical_supply_usages")
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT, related_name="clinical_supply_usages")
    consultation = models.ForeignKey("medical_records.ClinicalConsultation", on_delete=models.SET_NULL, null=True, blank=True, related_name="supply_usages")
    appointment = models.ForeignKey("appointments.Appointment", on_delete=models.SET_NULL, null=True, blank=True, related_name="supply_usages")
    doctor = models.ForeignKey("doctors.DoctorProfile", on_delete=models.SET_NULL, null=True, blank=True, related_name="supply_usages")
    nurse = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="nursing_supply_usages")
    inventory_item = models.ForeignKey("inventory.InventoryItem", on_delete=models.PROTECT, related_name="clinical_usages")
    inventory_lot = models.ForeignKey("inventory.InventoryLot", on_delete=models.PROTECT, null=True, blank=True, related_name="clinical_usages")
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    usage_type = models.CharField(max_length=30, choices=UsageType.choices, default=UsageType.OTHER)
    description = models.CharField(max_length=250, blank=True)
    notes = models.TextField(blank=True)
    billable = models.BooleanField(default=True)
    invoiced = models.BooleanField(default=False)
    invoice = models.ForeignKey("billing.Invoice", on_delete=models.SET_NULL, null=True, blank=True, related_name="clinical_consumptions")
    invoice_item = models.ForeignKey("billing.InvoiceItem", on_delete=models.SET_NULL, null=True, blank=True, related_name="clinical_consumptions")
    inventory_movement = models.ForeignKey("inventory.InventoryMovement", on_delete=models.SET_NULL, null=True, blank=True, related_name="clinical_consumptions")
    applied_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="clinical_supply_usages")
    applied_at = models.DateTimeField(default=timezone.now)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.APPLIED)
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-applied_at", "-creado_en"]
        indexes = [
            models.Index(fields=["clinic", "applied_at"]),
            models.Index(fields=["patient", "applied_at"]),
            models.Index(fields=["consultation", "status"]),
            models.Index(fields=["billable", "invoiced", "status"]),
        ]

    def clean(self):
        if self.quantity <= 0:
            raise ValidationError("La cantidad debe ser mayor que cero.")
        if self.unit_cost < 0 or self.unit_price < 0:
            raise ValidationError("Costo y precio no pueden ser negativos.")
        if self.patient_id and self.clinic_id and self.patient.clinic_id != self.clinic_id:
            raise ValidationError("El paciente debe pertenecer a la misma clinica.")
        if self.inventory_item_id and self.clinic_id and self.inventory_item.clinic_id != self.clinic_id:
            raise ValidationError("El producto debe pertenecer a la misma clinica.")
        if self.inventory_lot_id:
            if self.inventory_lot.item_id != self.inventory_item_id or self.inventory_lot.clinic_id != self.clinic_id:
                raise ValidationError("El lote debe pertenecer al producto y clinica indicados.")
            if self.inventory_lot.expiration_date and self.inventory_lot.expiration_date < timezone.localdate():
                raise ValidationError("No se puede aplicar un lote vencido.")
        if self.consultation_id:
            if self.consultation.patient_id != self.patient_id or self.consultation.clinic_id != self.clinic_id:
                raise ValidationError("La consulta debe pertenecer al mismo paciente y clinica.")
        if self.appointment_id:
            if self.appointment.patient_id != self.patient_id or self.appointment.clinic_id != self.clinic_id:
                raise ValidationError("La cita debe pertenecer al mismo paciente y clinica.")

    def save(self, *args, **kwargs):
        if self.patient_id and not self.clinic_id:
            self.clinic = self.patient.clinic
        if self.consultation_id:
            self.patient = self.consultation.patient
            self.clinic = self.consultation.clinic
            self.doctor = self.consultation.doctor
            if self.consultation.appointment_id and not self.appointment_id:
                self.appointment = self.consultation.appointment
        if self.inventory_item_id:
            if not self.description:
                self.description = self.inventory_item.name
            if not self.unit_cost:
                self.unit_cost = self.inventory_lot.cost_price if self.inventory_lot_id else self.inventory_item.cost_price
            if not self.unit_price:
                self.unit_price = self.inventory_item.sale_price
        self.total_price = (self.quantity * self.unit_price).quantize(Decimal("0.01"))
        self.full_clean()
        return super().save(*args, **kwargs)

    def cancel(self, user=None, reason=""):
        if self.invoiced or self.invoice_item_id:
            raise ValidationError("No se puede cancelar un consumo ya facturado.")
        if self.status == self.Status.CANCELLED:
            raise ValidationError("El consumo ya esta cancelado.")
        from apps.inventory.models import InventoryMovement

        with transaction.atomic():
            movement = InventoryMovement.objects.create(
                clinic=self.clinic,
                item=self.inventory_item,
                lot=self.inventory_lot,
                movement_type=InventoryMovement.Type.ENTRADA,
                quantity=self.quantity,
                unit_cost=self.unit_cost,
                reason="clinical_consumption_cancel",
                reference_type="clinical_consumption",
                reference_id=str(self.id),
                notes=reason,
                performed_by=user,
            )
            self.status = self.Status.CANCELLED
            self.active = False
            self.notes = f"{self.notes}\nCancelado: {reason}".strip()
            self.save(update_fields=["status", "active", "notes", "actualizado_en"])
            return movement
