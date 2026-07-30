from decimal import Decimal

from rest_framework import serializers

from apps.hospitalization.models import (
    HospitalBed,
    HospitalBedAssignment,
    HospitalRoom,
    HospitalVitalSigns,
    Hospitalization,
    HospitalizationEvent,
    DischargeSummary,
    MedicalEvolution,
    MedicalInstruction,
    MedicationAdministration,
    NursingNote,
    NursingRound,
    TreatmentPlan,
)
from apps.inventory.models import InventoryItem, InventoryLot
from apps.medical_records.models import ClinicalSupplyUsage


class HospitalRoomSerializer(serializers.ModelSerializer):
    clinic_nombre = serializers.CharField(source="clinic.nombre", read_only=True)
    beds_count = serializers.IntegerField(read_only=True)
    occupied_beds = serializers.IntegerField(read_only=True)

    class Meta:
        model = HospitalRoom
        fields = [
            "id",
            "clinic",
            "clinic_nombre",
            "name",
            "room_number",
            "floor",
            "room_type",
            "description",
            "is_active",
            "beds_count",
            "occupied_beds",
            "creado_en",
            "actualizado_en",
        ]
        read_only_fields = ["clinic", "creado_en", "actualizado_en"]

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("El nombre de la habitacion es obligatorio.")
        return value

    def validate_room_number(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("El numero de habitacion es obligatorio.")
        return value

    def validate(self, attrs):
        if self.instance and attrs.get("is_active") is False:
            if self.instance.beds.filter(assignments__released_at__isnull=True).exists():
                raise serializers.ValidationError({"is_active": "No se puede desactivar una habitacion con pacientes asignados."})
        return attrs


class HospitalBedSerializer(serializers.ModelSerializer):
    clinic_nombre = serializers.CharField(source="clinic.nombre", read_only=True)
    room_name = serializers.CharField(source="room.name", read_only=True)
    room_number = serializers.CharField(source="room.room_number", read_only=True)
    current_patient = serializers.SerializerMethodField()
    current_hospitalization = serializers.SerializerMethodField()

    class Meta:
        model = HospitalBed
        fields = [
            "id",
            "clinic",
            "clinic_nombre",
            "room",
            "room_name",
            "room_number",
            "bed_number",
            "bed_code",
            "status",
            "is_active",
            "notes",
            "current_patient",
            "current_hospitalization",
            "creado_en",
            "actualizado_en",
        ]
        read_only_fields = ["clinic", "bed_code", "current_patient", "current_hospitalization", "creado_en", "actualizado_en"]

    def get_current_hospitalization(self, obj):
        assignment = obj.assignments.filter(released_at__isnull=True).select_related("hospitalization").first()
        return assignment.hospitalization_id if assignment else None

    def get_current_patient(self, obj):
        assignment = obj.assignments.filter(released_at__isnull=True).select_related("hospitalization__patient").first()
        return assignment.hospitalization.patient.nombre_completo if assignment else ""

    def validate_bed_number(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("El numero de cama es obligatorio.")
        return value

    def validate(self, attrs):
        if self.instance:
            has_assignment = self.instance.assignments.filter(released_at__isnull=True).exists()
            next_status = attrs.get("status", self.instance.status)
            next_active = attrs.get("is_active", self.instance.is_active)
            if has_assignment and (next_status != HospitalBed.Status.OCCUPIED or not next_active):
                raise serializers.ValidationError("Una cama con asignacion activa debe permanecer ocupada y activa.")
            if not has_assignment and next_status == HospitalBed.Status.OCCUPIED:
                raise serializers.ValidationError({"status": "La ocupacion solo se establece mediante una asignacion de cama."})
        elif attrs.get("status") == HospitalBed.Status.OCCUPIED:
            raise serializers.ValidationError({"status": "La ocupacion solo se establece mediante una asignacion de cama."})
        return attrs


class HospitalBedAssignmentSerializer(serializers.ModelSerializer):
    bed_code = serializers.CharField(source="bed.bed_code", read_only=True)
    assigned_by_name = serializers.CharField(source="assigned_by.nombre_completo", read_only=True)

    class Meta:
        model = HospitalBedAssignment
        fields = ["id", "bed", "bed_code", "assigned_by", "assigned_by_name", "assigned_at", "released_at", "released_by", "release_reason", "notes"]
        read_only_fields = ["assigned_by", "assigned_at", "released_at", "released_by"]


class HospitalVitalSignsSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.CharField(source="recorded_by.nombre_completo", read_only=True)

    class Meta:
        model = HospitalVitalSigns
        fields = [
            "id",
            "hospitalization",
            "temperature",
            "blood_pressure_systolic",
            "blood_pressure_diastolic",
            "heart_rate",
            "respiratory_rate",
            "oxygen_saturation",
            "weight",
            "height",
            "bmi",
            "glucose",
            "pain_scale",
            "notes",
            "recorded_by",
            "recorded_by_name",
            "recorded_at",
            "is_abnormal",
            "alert_summary",
            "reviewed_at",
            "reviewed_by",
            "creado_en",
        ]
        read_only_fields = ["hospitalization", "bmi", "recorded_by", "recorded_at", "is_abnormal", "alert_summary", "reviewed_at", "reviewed_by", "creado_en"]

    def validate_temperature(self, value):
        if value is not None and (value < 30 or value > 45):
            raise serializers.ValidationError("La temperatura debe estar entre 30 y 45.")
        return value

    def validate_oxygen_saturation(self, value):
        if value is not None and (value < 0 or value > 100):
            raise serializers.ValidationError("La saturacion debe estar entre 0 y 100.")
        return value

    def validate_pain_scale(self, value):
        if value is not None and (value < 0 or value > 10):
            raise serializers.ValidationError("La escala de dolor debe estar entre 0 y 10.")
        return value

    def validate(self, attrs):
        systolic = attrs.get("blood_pressure_systolic")
        diastolic = attrs.get("blood_pressure_diastolic")
        if systolic is not None and diastolic is not None and systolic <= diastolic:
            raise serializers.ValidationError({"blood_pressure_systolic": "La presion sistolica debe ser mayor que la diastolica."})
        return attrs


class NursingNoteSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.nombre_completo", read_only=True)

    class Meta:
        model = NursingNote
        fields = ["id", "hospitalization", "note_type", "title", "note", "shift", "status", "correction_of", "correction_reason", "created_by", "created_by_name", "recorded_at", "creado_en"]
        read_only_fields = ["hospitalization", "status", "correction_of", "correction_reason", "created_by", "recorded_at", "creado_en"]

    def validate_note(self, value):
        value = value.strip()
        if len(value) < 5:
            raise serializers.ValidationError("La nota de enfermeria debe tener al menos 5 caracteres.")
        return value


class HospitalizationListSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.nombre_completo", read_only=True)
    patient_code = serializers.CharField(source="patient.codigo_paciente", read_only=True)
    responsible_doctor_name = serializers.CharField(source="responsible_doctor.user.nombre_completo", read_only=True)
    current_bed_code = serializers.CharField(source="current_bed.bed_code", read_only=True)
    current_room = serializers.CharField(source="current_bed.room.name", read_only=True)
    admitted_by_name = serializers.CharField(source="admitted_by.nombre_completo", read_only=True)
    patient_identity = serializers.CharField(source="patient.identidad", read_only=True)
    patient_birth_date = serializers.DateField(source="patient.fecha_nacimiento", read_only=True)
    patient_allergies = serializers.CharField(source="patient.alergias", read_only=True)
    patient_chronic_diseases = serializers.CharField(source="patient.enfermedades_cronicas", read_only=True)

    class Meta:
        model = Hospitalization
        fields = [
            "id",
            "clinic",
            "patient",
            "patient_name",
            "patient_code",
            "patient_identity",
            "patient_birth_date",
            "patient_allergies",
            "patient_chronic_diseases",
            "visit",
            "consultation",
            "admission_source",
            "responsible_doctor",
            "responsible_doctor_name",
            "current_bed",
            "current_bed_code",
            "current_room",
            "status",
            "reason",
            "diagnosis_at_admission",
            "admission_datetime",
            "expected_discharge_date",
            "discharge_datetime",
            "admitted_by_name",
        ]
        read_only_fields = ["clinic"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        role = getattr(getattr(getattr(request, "user", None), "role", None), "nombre", "")
        if role == "recepcionista":
            data.pop("patient_allergies", None)
            data.pop("patient_chronic_diseases", None)
        return data


class HospitalizationDetailSerializer(HospitalizationListSerializer):
    bed_assignments = HospitalBedAssignmentSerializer(many=True, read_only=True)
    recent_vital_signs = serializers.SerializerMethodField()
    recent_nursing_notes = serializers.SerializerMethodField()
    events = serializers.SerializerMethodField()
    active_treatment_plan = serializers.SerializerMethodField()
    active_instructions = serializers.SerializerMethodField()
    recent_evolutions = serializers.SerializerMethodField()

    class Meta(HospitalizationListSerializer.Meta):
        fields = HospitalizationListSerializer.Meta.fields + [
            "admitted_by",
            "discharged_by",
            "discharge_reason",
            "discharge_notes",
            "transfer_notes",
            "bed_assignments",
            "recent_vital_signs",
            "recent_nursing_notes",
            "events",
            "active_treatment_plan",
            "active_instructions",
            "recent_evolutions",
            "creado_en",
            "actualizado_en",
        ]
        read_only_fields = HospitalizationListSerializer.Meta.read_only_fields + ["admitted_by", "discharged_by", "creado_en", "actualizado_en"]

    def get_recent_vital_signs(self, obj):
        return HospitalVitalSignsSerializer(obj.vital_signs.all()[:5], many=True).data

    def get_recent_nursing_notes(self, obj):
        return NursingNoteSerializer(obj.nursing_notes.all()[:5], many=True).data

    def get_events(self, obj):
        return HospitalizationEventSerializer(obj.events.all()[:10], many=True).data

    def get_active_treatment_plan(self, obj):
        plan = obj.treatment_plans.filter(status=TreatmentPlan.Status.ACTIVE).order_by("-version").first()
        return TreatmentPlanSerializer(plan).data if plan else None

    def get_active_instructions(self, obj):
        statuses = [MedicalInstruction.Status.ACTIVE, MedicalInstruction.Status.ACKNOWLEDGED, MedicalInstruction.Status.IN_PROGRESS]
        return MedicalInstructionSerializer(obj.medical_instructions.filter(status__in=statuses)[:20], many=True).data

    def get_recent_evolutions(self, obj):
        return MedicalEvolutionSerializer(obj.medical_evolutions.exclude(status=MedicalEvolution.Status.DRAFT)[:10], many=True).data


class HospitalizationCreateSerializer(serializers.ModelSerializer):
    bed = serializers.PrimaryKeyRelatedField(queryset=HospitalBed.objects.all(), required=False, allow_null=True, write_only=True)
    status = serializers.ChoiceField(choices=[Hospitalization.Status.PENDING_ADMISSION, Hospitalization.Status.ACTIVE, Hospitalization.Status.OBSERVATION], default=Hospitalization.Status.PENDING_ADMISSION)

    class Meta:
        model = Hospitalization
        fields = [
            "patient",
            "visit",
            "consultation",
            "admission_source",
            "responsible_doctor",
            "bed",
            "status",
            "reason",
            "diagnosis_at_admission",
            "admission_datetime",
            "expected_discharge_date",
        ]

    def validate_reason(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("El motivo de internamiento es obligatorio.")
        return value


class BedActionSerializer(serializers.Serializer):
    bed = serializers.PrimaryKeyRelatedField(queryset=HospitalBed.objects.all())
    notes = serializers.CharField(required=False, allow_blank=True)


class DischargeSerializer(serializers.Serializer):
    discharge_reason = serializers.CharField(required=True, allow_blank=False)
    discharge_notes = serializers.CharField(required=False, allow_blank=True)
    allow_pending_balance = serializers.BooleanField(default=False)
    bed_status = serializers.ChoiceField(choices=[HospitalBed.Status.CLEANING], default=HospitalBed.Status.CLEANING)


class DischargeRequestSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, max_length=250)


class DischargeSummarySerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source="doctor.user.nombre_completo", read_only=True)
    signed_by_name = serializers.CharField(source="signed_by.nombre_completo", read_only=True)

    class Meta:
        model = DischargeSummary
        fields = ["id", "hospitalization", "doctor", "doctor_name", "version", "status", "discharge_type", "admission_summary", "hospital_course", "discharge_diagnoses", "procedures", "relevant_findings", "condition_at_discharge", "treatment_at_discharge", "recommendations", "warning_signs", "follow_up_plan", "pending_results", "signed_at", "signed_by", "signed_by_name", "replaces", "correction_reason", "prescription", "creado_en", "actualizado_en"]
        read_only_fields = ["hospitalization", "doctor", "version", "status", "signed_at", "signed_by", "replaces", "creado_en", "actualizado_en"]


class DischargeSummaryWriteSerializer(serializers.ModelSerializer):
    correction_reason = serializers.CharField(required=False, allow_blank=True, max_length=250)

    class Meta:
        model = DischargeSummary
        fields = ["discharge_type", "admission_summary", "hospital_course", "discharge_diagnoses", "procedures", "relevant_findings", "condition_at_discharge", "treatment_at_discharge", "recommendations", "warning_signs", "follow_up_plan", "pending_results", "prescription", "correction_reason"]

    def validate(self, attrs):
        prescription = attrs.get("prescription")
        hospitalization = self.context.get("hospitalization")
        if prescription and hospitalization and (prescription.clinic_id != hospitalization.clinic_id or prescription.patient_id != hospitalization.patient_id):
            raise serializers.ValidationError({"prescription": "La receta debe pertenecer al paciente y clinica del internamiento."})
        return attrs


class CancelHospitalizationSerializer(serializers.Serializer):
    reason = serializers.CharField()


class HospitalizationEventSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.nombre_completo", read_only=True)

    class Meta:
        model = HospitalizationEvent
        fields = ["id", "event_type", "description", "severity", "event_datetime", "created_by", "created_by_name", "metadata", "creado_en"]
        read_only_fields = ["created_by", "created_by_name", "metadata", "creado_en"]

    def validate_description(self, value):
        value = value.strip()
        if len(value) < 5:
            raise serializers.ValidationError("La descripcion debe tener al menos 5 caracteres.")
        return value


class MedicalEvolutionSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source="doctor.user.nombre_completo", read_only=True)

    class Meta:
        model = MedicalEvolution
        fields = ["id", "hospitalization", "doctor", "doctor_name", "status", "subjective", "objective", "assessment", "plan", "progress_notes", "diagnosis_changes", "treatment_changes", "observations", "signed_at", "correction_of", "correction_reason", "creado_en", "actualizado_en"]
        read_only_fields = ["hospitalization", "doctor", "status", "signed_at", "correction_of", "correction_reason", "creado_en", "actualizado_en"]


class MedicalEvolutionCorrectionSerializer(serializers.ModelSerializer):
    correction_reason = serializers.CharField(min_length=5, max_length=250)

    class Meta:
        model = MedicalEvolution
        fields = ["subjective", "objective", "assessment", "plan", "progress_notes", "diagnosis_changes", "treatment_changes", "observations", "correction_reason"]


class TreatmentPlanSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source="doctor.user.nombre_completo", read_only=True)

    class Meta:
        model = TreatmentPlan
        fields = ["id", "hospitalization", "doctor", "doctor_name", "version", "status", "goals", "treatment", "monitoring", "diet", "activity", "precautions", "expected_duration", "effective_from", "effective_until", "change_reason", "replaces", "creado_en"]
        read_only_fields = ["hospitalization", "doctor", "version", "status", "effective_until", "replaces", "creado_en"]


class MedicalInstructionSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source="doctor.user.nombre_completo", read_only=True)
    acknowledged_by_name = serializers.CharField(source="acknowledged_by.nombre_completo", read_only=True)
    completed_by_name = serializers.CharField(source="completed_by.nombre_completo", read_only=True)

    class Meta:
        model = MedicalInstruction
        fields = ["id", "hospitalization", "treatment_plan", "doctor", "doctor_name", "instruction_type", "priority", "status", "title", "details", "frequency", "inventory_item", "generic_name", "concentration", "dose", "dose_unit", "route", "interval_hours", "inventory_quantity", "as_needed", "maximum_daily_dose", "allergy_warning", "allergy_override_reason", "version", "effective_from", "effective_until", "acknowledged_by", "acknowledged_by_name", "acknowledged_at", "completed_by", "completed_by_name", "completed_at", "status_reason", "replaces", "creado_en"]
        read_only_fields = ["hospitalization", "doctor", "status", "allergy_warning", "version", "acknowledged_by", "acknowledged_at", "completed_by", "completed_at", "status_reason", "replaces", "creado_en"]

    def validate(self, attrs):
        start = attrs.get("effective_from", getattr(self.instance, "effective_from", None))
        end = attrs.get("effective_until", getattr(self.instance, "effective_until", None))
        if start and end and end <= start:
            raise serializers.ValidationError({"effective_until": "La fecha final debe ser posterior a la fecha inicial."})
        return attrs


class MedicalInstructionReplaceSerializer(MedicalInstructionSerializer):
    reason = serializers.CharField(write_only=True, min_length=5, max_length=250)

    class Meta(MedicalInstructionSerializer.Meta):
        fields = [field for field in MedicalInstructionSerializer.Meta.fields if field not in {"id", "hospitalization", "doctor", "doctor_name", "status", "allergy_warning", "version", "acknowledged_by", "acknowledged_by_name", "acknowledged_at", "completed_by", "completed_by_name", "completed_at", "status_reason", "replaces", "creado_en"}] + ["reason"]


class InstructionStatusSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, max_length=250)


class NursingNoteCorrectionSerializer(serializers.Serializer):
    reason = serializers.CharField(min_length=5, max_length=250)
    note = serializers.CharField(min_length=5)


class NursingRoundSerializer(serializers.ModelSerializer):
    nurse_name = serializers.CharField(source="nurse.nombre_completo", read_only=True)
    patient_name = serializers.CharField(source="patient.nombre_completo", read_only=True)
    created_at = serializers.DateTimeField(source="creado_en", read_only=True)

    class Meta:
        model = NursingRound
        fields = [
            "id",
            "clinic",
            "hospitalization",
            "patient",
            "patient_name",
            "nurse",
            "nurse_name",
            "round_type",
            "status",
            "notes",
            "general_condition",
            "pain_level",
            "consciousness_status",
            "mobility_status",
            "feeding_status",
            "elimination_status",
            "scheduled_at",
            "completed_at",
            "status_reason",
            "created_at",
            "creado_en",
            "actualizado_en",
        ]
        read_only_fields = ["clinic", "hospitalization", "patient", "nurse", "creado_en", "actualizado_en"]


class NursingRoundCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = NursingRound
        fields = ["round_type", "status", "notes", "general_condition", "pain_level", "consciousness_status", "mobility_status", "feeding_status", "elimination_status", "scheduled_at", "status_reason"]

    def validate_pain_level(self, value):
        if value is not None and (value < 0 or value > 10):
            raise serializers.ValidationError("El nivel de dolor debe estar entre 0 y 10.")
        return value


class MedicationAdministrationSerializer(serializers.ModelSerializer):
    administered_by_name = serializers.CharField(source="administered_by.nombre_completo", read_only=True)
    patient_name = serializers.CharField(source="patient.nombre_completo", read_only=True)
    patient_identity = serializers.CharField(source="patient.identidad", read_only=True)
    patient_allergies = serializers.CharField(source="patient.alergias", read_only=True)
    allergy_warning = serializers.CharField(source="instruction.allergy_warning", read_only=True, default="")
    instruction_notes = serializers.CharField(source="instruction.details", read_only=True, default="")
    room_name = serializers.SerializerMethodField()
    bed_number = serializers.SerializerMethodField()
    stock_available = serializers.DecimalField(source="inventory_item.stock_current", max_digits=12, decimal_places=2, read_only=True, allow_null=True)
    created_at = serializers.DateTimeField(source="creado_en", read_only=True)
    delay_minutes = serializers.SerializerMethodField()

    def get_room_name(self, obj):
        bed = obj.hospitalization.current_bed
        return bed.room.name if bed and bed.room_id else ""

    def get_bed_number(self, obj):
        bed = obj.hospitalization.current_bed
        return bed.bed_number if bed else ""

    def get_delay_minutes(self, obj):
        actual_time = obj.administered_time or obj.status_recorded_at
        if not obj.scheduled_time or not actual_time or actual_time <= obj.scheduled_time:
            return 0
        return int((actual_time - obj.scheduled_time).total_seconds() // 60)

    class Meta:
        model = MedicationAdministration
        fields = [
            "id",
            "clinic",
            "hospitalization",
            "patient",
            "patient_name",
            "patient_identity",
            "patient_allergies",
            "room_name",
            "bed_number",
            "instruction",
            "allergy_warning",
            "instruction_notes",
            "inventory_item",
            "stock_available",
            "selected_lot",
            "prescription",
            "prescription_item",
            "medication_name",
            "dosage",
            "ordered_dose",
            "administered_dose",
            "dose_unit",
            "inventory_quantity",
            "administered_quantity",
            "route",
            "scheduled_time",
            "administered_time",
            "status_recorded_at",
            "delay_minutes",
            "status",
            "administered_by",
            "administered_by_name",
            "notes",
            "omission_reason",
            "refusal_reason",
            "unavailable_reason",
            "delay_reason",
            "inventory_processed_at",
            "reversed_at",
            "reversed_by",
            "reversal_reason",
            "created_at",
            "creado_en",
            "actualizado_en",
        ]
        read_only_fields = ["clinic", "hospitalization", "patient", "administered_by", "administered_time", "creado_en", "actualizado_en"]


class MedicationAdministrationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicationAdministration
        fields = ["instruction", "scheduled_time", "notes"]

    def validate(self, attrs):
        if not attrs.get("instruction"):
            raise serializers.ValidationError({"instruction": "Selecciona una indicacion medica de medicamento."})
        return attrs


class MedicationAdministrationActionSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True)
    reason = serializers.CharField(required=False, allow_blank=True)
    administered_at = serializers.DateTimeField(required=False)
    administered_dose = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, min_value=Decimal("0.01"))
    dose_unit = serializers.CharField(required=False, allow_blank=True, max_length=40)
    route = serializers.ChoiceField(choices=MedicationAdministration.Route.choices, required=False)
    inventory_quantity = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, min_value=Decimal("0.01"))
    selected_lot = serializers.PrimaryKeyRelatedField(queryset=InventoryLot.objects.all(), required=False, allow_null=True)
    idempotency_key = serializers.CharField(required=False, allow_blank=True, max_length=100)


class HospitalConsumptionSerializer(serializers.ModelSerializer):
    inventory_item_name = serializers.CharField(source="inventory_item.name", read_only=True)
    inventory_lot_number = serializers.CharField(source="inventory_lot.lot_number", read_only=True)

    class Meta:
        model = ClinicalSupplyUsage
        fields = ["id", "hospitalization", "inventory_item", "inventory_item_name", "inventory_lot", "inventory_lot_number", "quantity", "usage_type", "description", "notes", "billable", "unit_price", "total_price", "status", "invoiced", "applied_by", "applied_at", "creado_en"]
        read_only_fields = fields


class HospitalConsumptionCreateSerializer(serializers.Serializer):
    inventory_item = serializers.PrimaryKeyRelatedField(queryset=InventoryItem.objects.filter(active=True))
    inventory_lot = serializers.PrimaryKeyRelatedField(queryset=InventoryLot.objects.filter(active=True), required=False, allow_null=True)
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.01"))
    usage_type = serializers.ChoiceField(choices=ClinicalSupplyUsage.UsageType.choices, default=ClinicalSupplyUsage.UsageType.SUPPLY)
    description = serializers.CharField(required=False, allow_blank=True, max_length=250)
    notes = serializers.CharField(required=False, allow_blank=True)
    billable = serializers.BooleanField(default=True)
    idempotency_key = serializers.CharField(required=False, allow_blank=True, max_length=100)
