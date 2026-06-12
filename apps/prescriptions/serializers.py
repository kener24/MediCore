from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from apps.accounts.permissions import get_role_name
from apps.medical_records.models import ClinicalConsultation
from apps.prescriptions.models import Diagnosis, MedicalOrder, Prescription, PrescriptionItem


def is_doctor_owner(user, consultation):
    return get_role_name(user) == "medico" and consultation.doctor.user_id == user.id


def validate_doctor_can_manage(user, consultation):
    if get_role_name(user) != "medico":
        raise serializers.ValidationError("Solo medicos pueden registrar esta informacion clinica.")
    if consultation.doctor.user_id != user.id:
        raise serializers.ValidationError("No puedes modificar informacion de consultas de otro medico.")
    if consultation.status == ClinicalConsultation.Status.ANULADA:
        raise serializers.ValidationError("No puedes modificar una consulta anulada.")


def can_view_clinical_data(user, clinic_id, patient_user_id=None):
    role = get_role_name(user)
    if user.is_superuser or role == "superadmin":
        return True
    if role in ["admin", "medico", "enfermera"] and user.clinica_id == clinic_id:
        return True
    return role == "paciente" and patient_user_id == user.id


class DiagnosisListSerializer(serializers.ModelSerializer):
    clinic_nombre = serializers.CharField(source="clinic.nombre", read_only=True)
    patient_nombre = serializers.CharField(source="patient.nombre_completo", read_only=True)
    doctor_nombre = serializers.CharField(source="doctor.user.nombre_completo", read_only=True)

    class Meta:
        model = Diagnosis
        fields = ["id", "clinic", "clinic_nombre", "patient", "patient_nombre", "doctor", "doctor_nombre", "consultation", "code", "name", "description", "diagnosis_type", "is_primary", "activo", "creado_en", "actualizado_en"]


class DiagnosisDetailSerializer(DiagnosisListSerializer):
    class Meta(DiagnosisListSerializer.Meta):
        fields = DiagnosisListSerializer.Meta.fields + ["notes"]


class DiagnosisCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Diagnosis
        fields = ["id", "consultation", "code", "name", "description", "diagnosis_type", "is_primary", "notes"]
        read_only_fields = ["id"]

    def validate(self, attrs):
        consultation = attrs["consultation"]
        validate_doctor_can_manage(self.context["request"].user, consultation)
        instance = Diagnosis(**attrs)
        try:
            instance.clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages)
        return attrs


class DiagnosisUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Diagnosis
        fields = ["code", "name", "description", "diagnosis_type", "is_primary", "notes", "activo"]

    def validate(self, attrs):
        validate_doctor_can_manage(self.context["request"].user, self.instance.consultation)
        if self.instance.consultation.status == ClinicalConsultation.Status.FINALIZADA:
            raise serializers.ValidationError("No puedes editar diagnosticos de una consulta finalizada.")
        instance = Diagnosis(
            id=self.instance.id,
            clinic=self.instance.clinic,
            patient=self.instance.patient,
            doctor=self.instance.doctor,
            consultation=self.instance.consultation,
            code=attrs.get("code", self.instance.code),
            name=attrs.get("name", self.instance.name),
            description=attrs.get("description", self.instance.description),
            diagnosis_type=attrs.get("diagnosis_type", self.instance.diagnosis_type),
            is_primary=attrs.get("is_primary", self.instance.is_primary),
            notes=attrs.get("notes", self.instance.notes),
            activo=attrs.get("activo", self.instance.activo),
        )
        try:
            instance.clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages)
        return attrs


class PrescriptionItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrescriptionItem
        fields = ["id", "prescription", "medication_name", "presentation", "dosage", "frequency", "duration", "quantity", "route", "instructions", "activo", "creado_en", "actualizado_en"]
        read_only_fields = ["id", "prescription", "creado_en", "actualizado_en"]


class PrescriptionListSerializer(serializers.ModelSerializer):
    clinic_nombre = serializers.CharField(source="clinic.nombre", read_only=True)
    patient_nombre = serializers.CharField(source="patient.nombre_completo", read_only=True)
    doctor_nombre = serializers.CharField(source="doctor.user.nombre_completo", read_only=True)
    medications = serializers.SerializerMethodField()

    class Meta:
        model = Prescription
        fields = ["id", "clinic", "clinic_nombre", "patient", "patient_nombre", "doctor", "doctor_nombre", "consultation", "prescription_number", "issue_date", "general_instructions", "status", "medications", "activo", "creado_en", "actualizado_en"]

    def get_medications(self, obj):
        return [item.medication_name for item in obj.items.filter(activo=True)[:4]]


class PrescriptionDetailSerializer(PrescriptionListSerializer):
    items = PrescriptionItemSerializer(many=True, read_only=True)

    class Meta(PrescriptionListSerializer.Meta):
        fields = PrescriptionListSerializer.Meta.fields + ["void_reason", "items"]


class PrescriptionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prescription
        fields = ["id", "consultation", "prescription_number", "issue_date", "general_instructions", "status"]
        read_only_fields = ["id"]
        extra_kwargs = {"prescription_number": {"required": False}}

    def validate(self, attrs):
        consultation = attrs["consultation"]
        validate_doctor_can_manage(self.context["request"].user, consultation)
        return attrs


class PrescriptionUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prescription
        fields = ["issue_date", "general_instructions", "status", "activo"]

    def validate(self, attrs):
        validate_doctor_can_manage(self.context["request"].user, self.instance.consultation)
        if self.instance.status == Prescription.Status.EMITIDA:
            raise serializers.ValidationError("No puedes editar una receta emitida.")
        return attrs


class PrescriptionIssueSerializer(serializers.Serializer):
    pass


class MedicalOrderListSerializer(serializers.ModelSerializer):
    clinic_nombre = serializers.CharField(source="clinic.nombre", read_only=True)
    patient_nombre = serializers.CharField(source="patient.nombre_completo", read_only=True)
    doctor_nombre = serializers.CharField(source="doctor.user.nombre_completo", read_only=True)

    class Meta:
        model = MedicalOrder
        fields = ["id", "clinic", "clinic_nombre", "patient", "patient_nombre", "doctor", "doctor_nombre", "consultation", "order_number", "order_type", "title", "description", "instructions", "priority", "status", "activo", "creado_en", "actualizado_en"]


class MedicalOrderDetailSerializer(MedicalOrderListSerializer):
    pass


class MedicalOrderCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicalOrder
        fields = ["id", "consultation", "order_number", "order_type", "title", "description", "instructions", "priority", "status"]
        read_only_fields = ["id"]
        extra_kwargs = {"order_number": {"required": False}}

    def validate(self, attrs):
        consultation = attrs["consultation"]
        validate_doctor_can_manage(self.context["request"].user, consultation)
        return attrs


class MedicalOrderUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicalOrder
        fields = ["order_type", "title", "description", "instructions", "priority", "status", "activo"]

    def validate(self, attrs):
        validate_doctor_can_manage(self.context["request"].user, self.instance.consultation)
        return attrs


class PrescriptionStatsSerializer(serializers.Serializer):
    total_prescriptions = serializers.IntegerField()
    draft_prescriptions = serializers.IntegerField()
    issued_prescriptions = serializers.IntegerField()
    voided_prescriptions = serializers.IntegerField()
    total_orders = serializers.IntegerField()
    pending_orders = serializers.IntegerField()
    completed_orders = serializers.IntegerField()
    cancelled_orders = serializers.IntegerField()
