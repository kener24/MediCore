from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.accounts.permissions import get_role_name
from apps.appointments.models import Appointment
from apps.doctors.models import DoctorProfile
from apps.inventory.models import InventoryItem, InventoryLot, InventoryMovement
from apps.medical_records.models import ClinicalConsultation, ClinicalSupplyUsage, MedicalRecord, VitalSigns
from apps.patients.models import Patient


def user_can_access_clinic(user, clinic_id):
    role = get_role_name(user)
    if role == "superadmin" or user.is_superuser:
        return False
    return bool(user.clinica_id and user.clinica_id == clinic_id)


class MedicalRecordListSerializer(serializers.ModelSerializer):
    clinic_nombre = serializers.CharField(source="clinic.nombre", read_only=True)
    patient_nombre = serializers.CharField(source="patient.nombre_completo", read_only=True)
    patient_identidad = serializers.CharField(source="patient.identidad", read_only=True)
    patient_codigo = serializers.CharField(source="patient.codigo_paciente", read_only=True)

    class Meta:
        model = MedicalRecord
        fields = [
            "id",
            "clinic",
            "clinic_nombre",
            "patient",
            "patient_nombre",
            "patient_identidad",
            "patient_codigo",
            "record_number",
            "blood_type",
            "activo",
            "creado_en",
            "actualizado_en",
        ]


class MedicalRecordDetailSerializer(MedicalRecordListSerializer):
    class Meta(MedicalRecordListSerializer.Meta):
        fields = MedicalRecordListSerializer.Meta.fields + [
            "allergies",
            "chronic_diseases",
            "surgical_history",
            "family_history",
            "current_medications",
            "general_notes",
        ]


class MedicalRecordCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicalRecord
        fields = [
            "id",
            "clinic",
            "patient",
            "record_number",
            "blood_type",
            "allergies",
            "chronic_diseases",
            "surgical_history",
            "family_history",
            "current_medications",
            "general_notes",
            "activo",
        ]
        read_only_fields = ["id"]
        extra_kwargs = {"clinic": {"required": False}, "record_number": {"required": False}}
        validators = []

    def validate(self, attrs):
        request = self.context["request"]
        patient = attrs["patient"]
        if not user_can_access_clinic(request.user, patient.clinic_id):
            raise serializers.ValidationError("No tienes permiso sobre la clinica del paciente.")
        attrs["clinic"] = patient.clinic
        if MedicalRecord.objects.filter(patient=patient).exists():
            raise serializers.ValidationError({"patient": "Este paciente ya tiene expediente medico."})
        record_number = attrs.get("record_number")
        if record_number and MedicalRecord.objects.filter(clinic=patient.clinic, record_number=record_number).exists():
            raise serializers.ValidationError({"record_number": "Ya existe ese numero de expediente en esta clinica."})
        return attrs


class MedicalRecordUpdateSerializer(MedicalRecordCreateSerializer):
    def validate(self, attrs):
        request = self.context["request"]
        clinic = self.instance.clinic
        if not user_can_access_clinic(request.user, clinic.id):
            raise serializers.ValidationError("No tienes permiso sobre este expediente.")
        attrs["clinic"] = clinic
        attrs["patient"] = self.instance.patient
        record_number = attrs.get("record_number")
        if record_number and MedicalRecord.objects.filter(clinic=clinic, record_number=record_number).exclude(id=self.instance.id).exists():
            raise serializers.ValidationError({"record_number": "Ya existe ese numero de expediente en esta clinica."})
        return attrs


class MedicalRecordMeSerializer(serializers.ModelSerializer):
    patient_nombre = serializers.CharField(source="patient.nombre_completo", read_only=True)

    class Meta:
        model = MedicalRecord
        fields = ["id", "patient_nombre", "record_number", "blood_type", "allergies", "chronic_diseases", "general_notes", "actualizado_en"]


class VitalSignsSerializer(serializers.ModelSerializer):
    registrado_por_nombre = serializers.CharField(source="registrado_por.nombre_completo", read_only=True)

    class Meta:
        model = VitalSigns
        fields = [
            "id",
            "consultation",
            "patient_visit",
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
            "registrado_por",
            "registrado_por_nombre",
            "recorded_at",
            "creado_en",
            "actualizado_en",
        ]
        read_only_fields = ["id", "consultation", "patient_visit", "bmi", "registrado_por", "recorded_at", "creado_en", "actualizado_en"]


class ClinicalConsultationListSerializer(serializers.ModelSerializer):
    clinic_nombre = serializers.CharField(source="clinic.nombre", read_only=True)
    patient_nombre = serializers.CharField(source="patient.nombre_completo", read_only=True)
    patient_codigo = serializers.CharField(source="patient.codigo_paciente", read_only=True)
    doctor_nombre = serializers.CharField(source="doctor.user.nombre_completo", read_only=True)
    specialty_nombre = serializers.CharField(source="doctor.specialty.nombre", read_only=True)
    record_number = serializers.CharField(source="medical_record.record_number", read_only=True)

    class Meta:
        model = ClinicalConsultation
        fields = [
            "id",
            "clinic",
            "clinic_nombre",
            "medical_record",
            "record_number",
            "patient",
            "patient_nombre",
            "patient_codigo",
            "doctor",
            "doctor_nombre",
            "specialty_nombre",
            "appointment",
            "patient_visit",
            "consultation_date",
            "start_time",
            "end_time",
            "chief_complaint",
            "preliminary_diagnosis",
            "status",
            "version",
            "activo",
            "creado_en",
            "actualizado_en",
        ]


class ClinicalConsultationDetailSerializer(ClinicalConsultationListSerializer):
    vital_signs = VitalSignsSerializer(read_only=True)
    created_by_nombre = serializers.CharField(source="created_by.nombre_completo", read_only=True)
    finalized_by_nombre = serializers.CharField(source="finalized_by.nombre_completo", read_only=True)

    class Meta(ClinicalConsultationListSerializer.Meta):
        fields = ClinicalConsultationListSerializer.Meta.fields + [
            "symptoms",
            "physical_exam",
            "clinical_assessment",
            "treatment_plan",
            "recommendations",
            "private_notes",
            "void_reason",
            "created_by",
            "created_by_nombre",
            "finalized_by",
            "finalized_by_nombre",
            "finalized_at",
            "vital_signs",
        ]


class ClinicalConsultationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClinicalConsultation
        fields = [
            "id",
            "medical_record",
            "patient",
            "doctor",
            "appointment",
            "consultation_date",
            "start_time",
            "end_time",
            "chief_complaint",
            "symptoms",
            "physical_exam",
            "clinical_assessment",
            "preliminary_diagnosis",
            "treatment_plan",
            "recommendations",
            "private_notes",
            "status",
        ]
        read_only_fields = ["id"]
        extra_kwargs = {"medical_record": {"required": False}, "appointment": {"required": False}}

    def validate(self, attrs):
        request = self.context["request"]
        role = get_role_name(request.user)
        if role != "medico":
            raise serializers.ValidationError("Solo medicos pueden crear consultas clinicas.")
        patient = attrs["patient"]
        doctor = attrs["doctor"]
        if doctor.user_id != request.user.id:
            raise serializers.ValidationError("No puedes crear consultas para otro medico.")
        if patient.clinic_id != doctor.clinic_id:
            raise serializers.ValidationError("Paciente y medico deben pertenecer a la misma clinica.")
        record = attrs.get("medical_record") or MedicalRecord.objects.filter(patient=patient).first()
        if not record:
            record = MedicalRecord.objects.create(patient=patient)
        if record.patient_id != patient.id:
            raise serializers.ValidationError("El expediente no pertenece al paciente.")
        appointment = attrs.get("appointment")
        if appointment:
            if appointment.status == Appointment.Status.CANCELADA:
                raise serializers.ValidationError("No puedes iniciar consulta desde una cita cancelada.")
            if appointment.patient_id != patient.id or appointment.doctor_id != doctor.id:
                raise serializers.ValidationError("La cita no coincide con paciente y medico.")
        attrs["clinic"] = patient.clinic
        attrs["medical_record"] = record
        attrs["created_by"] = request.user
        instance = ClinicalConsultation(**attrs)
        try:
            instance.clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages)
        return attrs


class ClinicalConsultationUpdateSerializer(serializers.ModelSerializer):
    expected_version = serializers.IntegerField(write_only=True, required=False, min_value=1)

    class Meta:
        model = ClinicalConsultation
        fields = [
            "consultation_date",
            "start_time",
            "end_time",
            "chief_complaint",
            "symptoms",
            "physical_exam",
            "clinical_assessment",
            "preliminary_diagnosis",
            "treatment_plan",
            "recommendations",
            "private_notes",
            "expected_version",
        ]

    def validate(self, attrs):
        request = self.context["request"]
        if self.instance.status == ClinicalConsultation.Status.FINALIZADA:
            raise serializers.ValidationError("No se puede editar una consulta finalizada.")
        if get_role_name(request.user) != "medico":
            raise serializers.ValidationError("Solo médicos pueden editar consultas clínicas.")
        if self.instance.doctor.user_id != request.user.id:
            raise serializers.ValidationError("No puedes editar consultas de otro medico.")
        return attrs

    def update(self, instance, validated_data):
        validated_data.pop("expected_version", None)
        return super().update(instance, validated_data)


class ClinicalConsultationFinalizeSerializer(serializers.Serializer):
    chief_complaint = serializers.CharField(required=False, allow_blank=True)
    clinical_assessment = serializers.CharField(required=False, allow_blank=True)
    preliminary_diagnosis = serializers.CharField(required=False, allow_blank=True)
    treatment_plan = serializers.CharField(required=False, allow_blank=True)
    expected_version = serializers.IntegerField(required=False, min_value=1, write_only=True)

    def validate(self, attrs):
        instance = self.context["consultation"]
        complaint = attrs.get("chief_complaint", instance.chief_complaint)
        assessment = attrs.get("clinical_assessment", instance.clinical_assessment)
        diagnosis = attrs.get("preliminary_diagnosis", instance.preliminary_diagnosis)
        plan = attrs.get("treatment_plan", instance.treatment_plan)
        errors = {}
        if not complaint.strip():
            errors["chief_complaint"] = "Debes registrar el motivo de consulta."
        if not (assessment.strip() or diagnosis.strip()):
            errors["clinical_assessment"] = "Debes registrar una evaluacion o diagnostico."
        if not plan.strip():
            errors["treatment_plan"] = "Debes registrar el plan de atencion."
        if errors:
            raise serializers.ValidationError(errors)
        return attrs


class ClinicalHistorySerializer(serializers.Serializer):
    patient = serializers.DictField()
    medical_record = MedicalRecordDetailSerializer(allow_null=True)
    consultations = ClinicalConsultationDetailSerializer(many=True)
    future_sections = serializers.DictField()


class MedicalRecordStatsSerializer(serializers.Serializer):
    total_records = serializers.IntegerField()
    active_records = serializers.IntegerField()
    total_consultations = serializers.IntegerField()
    consultations_today = serializers.IntegerField()
    draft_consultations = serializers.IntegerField()
    finalized_consultations = serializers.IntegerField()


class ClinicalSupplyUsageSerializer(serializers.ModelSerializer):
    clinic_nombre = serializers.CharField(source="clinic.nombre", read_only=True)
    patient_nombre = serializers.CharField(source="patient.nombre_completo", read_only=True)
    consultation_date = serializers.DateField(source="consultation.consultation_date", read_only=True)
    doctor_nombre = serializers.CharField(source="doctor.user.nombre_completo", read_only=True)
    inventory_item_nombre = serializers.CharField(source="inventory_item.name", read_only=True)
    inventory_item_type = serializers.CharField(source="inventory_item.item_type", read_only=True)
    inventory_item_stock = serializers.DecimalField(source="inventory_item.stock_current", max_digits=12, decimal_places=2, read_only=True)
    inventory_lot_number = serializers.CharField(source="inventory_lot.lot_number", read_only=True)
    applied_by_nombre = serializers.CharField(source="applied_by.nombre_completo", read_only=True)
    group_quantity = serializers.SerializerMethodField()
    group_parts = serializers.SerializerMethodField()

    class Meta:
        model = ClinicalSupplyUsage
        fields = [
            "id",
            "clinic",
            "clinic_nombre",
            "patient",
            "patient_nombre",
            "consultation",
            "consultation_date",
            "appointment",
            "doctor",
            "doctor_nombre",
            "nurse",
            "inventory_item",
            "inventory_item_nombre",
            "inventory_item_type",
            "inventory_item_stock",
            "inventory_lot",
            "inventory_lot_number",
            "quantity",
            "unit_cost",
            "unit_price",
            "total_price",
            "usage_type",
            "description",
            "notes",
            "billable",
            "invoiced",
            "invoice",
            "invoice_item",
            "inventory_movement",
            "idempotency_key",
            "consumption_group",
            "group_quantity",
            "group_parts",
            "applied_by",
            "applied_by_nombre",
            "applied_at",
            "cancelled_by",
            "cancelled_at",
            "cancellation_reason",
            "status",
            "active",
            "creado_en",
            "actualizado_en",
        ]
        read_only_fields = ["clinic", "doctor", "nurse", "unit_cost", "total_price", "invoiced", "invoice", "invoice_item", "inventory_movement", "idempotency_key", "consumption_group", "group_quantity", "group_parts", "applied_by", "applied_at", "cancelled_by", "cancelled_at", "cancellation_reason", "status"]

    def _group(self, obj):
        if not obj.consumption_group:
            return [obj]
        if hasattr(obj, "_group_usages"):
            return obj._group_usages
        return list(ClinicalSupplyUsage.objects.filter(consumption_group=obj.consumption_group).select_related("inventory_lot").order_by("id"))

    def get_group_quantity(self, obj):
        return str(sum((part.quantity for part in self._group(obj)), Decimal("0")))

    def get_group_parts(self, obj):
        return [
            {"id": part.id, "inventory_lot": part.inventory_lot_id, "inventory_lot_number": getattr(part.inventory_lot, "lot_number", None), "quantity": str(part.quantity), "status": part.status}
            for part in self._group(obj)
        ]


class ClinicalSupplyUsageCreateSerializer(serializers.ModelSerializer):
    inventory_item = serializers.PrimaryKeyRelatedField(queryset=InventoryItem.objects.all(), required=False)
    item_id = serializers.PrimaryKeyRelatedField(source="inventory_item", queryset=InventoryItem.objects.all(), required=False, write_only=True)
    visit = serializers.IntegerField(required=False, write_only=True)
    idempotency_key = serializers.CharField(required=False, allow_blank=True, max_length=100, write_only=True)
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.01"))
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.00"), required=False)

    class Meta:
        model = ClinicalSupplyUsage
        fields = ["id", "patient", "consultation", "appointment", "visit", "inventory_item", "item_id", "inventory_lot", "quantity", "unit_price", "usage_type", "description", "notes", "billable", "idempotency_key"]
        read_only_fields = ["id"]

    def validate(self, attrs):
        request = self.context["request"]
        role = get_role_name(request.user)
        if role not in ["admin", "medico", "enfermera"]:
            raise serializers.ValidationError("No tienes permiso para registrar consumos clinicos.")
        attrs.pop("visit", None)
        item = attrs.get("inventory_item")
        if not item:
            raise serializers.ValidationError({"inventory_item": "Selecciona un producto de inventario."})
        if not item.active:
            raise serializers.ValidationError({"inventory_item": "El producto esta inactivo."})
        if item.clinic_id != request.user.clinica_id:
            raise serializers.ValidationError("No tienes permiso sobre este producto.")
        consultation = attrs.get("consultation")
        patient = attrs.get("patient")
        if consultation:
            patient = consultation.patient
            attrs["patient"] = patient
            attrs["appointment"] = attrs.get("appointment") or consultation.appointment
            attrs["doctor"] = consultation.doctor
            if consultation.status == ClinicalConsultation.Status.FINALIZADA:
                raise serializers.ValidationError({"consultation": "No puedes registrar consumos en una consulta finalizada."})
        if not patient:
            raise serializers.ValidationError({"patient": "El paciente es obligatorio."})
        if patient.clinic_id != request.user.clinica_id:
            raise serializers.ValidationError("No tienes permiso sobre este paciente.")
        if patient.clinic_id != item.clinic_id:
            raise serializers.ValidationError("Paciente y producto deben pertenecer a la misma clinica.")
        lot = attrs.get("inventory_lot")
        if lot:
            if lot.item_id != item.id or lot.clinic_id != item.clinic_id:
                raise serializers.ValidationError({"inventory_lot": "El lote no corresponde al producto."})
            if lot.expiration_date and lot.expiration_date < timezone.localdate():
                raise serializers.ValidationError({"inventory_lot": "No se puede usar un lote vencido."})
            if lot.quantity_current < attrs["quantity"]:
                raise serializers.ValidationError({"quantity": "El lote no tiene stock suficiente."})
        if item.stock_current < attrs["quantity"]:
            raise serializers.ValidationError({"quantity": "No hay stock suficiente."})
        attrs["clinic"] = patient.clinic
        attrs["applied_by"] = request.user
        if role == "enfermera":
            attrs["nurse"] = request.user
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        from apps.medical_records.services import consume_inventory_item

        return consume_inventory_item(validated_data)


class ClinicalSupplyUsageCancelSerializer(serializers.Serializer):
    reason = serializers.CharField(required=True, allow_blank=False)
