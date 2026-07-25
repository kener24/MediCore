from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers

from apps.accounts.permissions import get_role_name
from apps.medical_records.models import ClinicalConsultation
from apps.prescriptions.models import Diagnosis, MedicalOrder, Prescription, PrescriptionItem, find_allergy_conflicts


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
        return False
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
    allergy_warnings = serializers.SerializerMethodField()

    class Meta:
        model = PrescriptionItem
        fields = ["id", "prescription", "medication_name", "presentation", "dosage", "frequency", "duration", "quantity", "route", "instructions", "allergy_warnings", "activo", "creado_en", "actualizado_en"]
        read_only_fields = ["id", "prescription", "creado_en", "actualizado_en"]

    def validate(self, attrs):
        prescription = self.context.get("prescription") or getattr(self.instance, "prescription", None)
        if not prescription:
            return attrs
        instance = PrescriptionItem(
            id=getattr(self.instance, "id", None),
            prescription=prescription,
            medication_name=attrs.get("medication_name", getattr(self.instance, "medication_name", "")),
            presentation=attrs.get("presentation", getattr(self.instance, "presentation", "")),
            dosage=attrs.get("dosage", getattr(self.instance, "dosage", "")),
            frequency=attrs.get("frequency", getattr(self.instance, "frequency", "")),
            duration=attrs.get("duration", getattr(self.instance, "duration", "")),
            quantity=attrs.get("quantity", getattr(self.instance, "quantity", "")),
            route=attrs.get("route", getattr(self.instance, "route", PrescriptionItem.Route.ORAL)),
            instructions=attrs.get("instructions", getattr(self.instance, "instructions", "")),
            activo=attrs.get("activo", getattr(self.instance, "activo", True)),
        )
        try:
            instance.clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict if hasattr(exc, "message_dict") else exc.messages)
        return attrs

    def validate_quantity(self, value):
        if value in (None, ""):
            return value
        try:
            from decimal import Decimal

            if Decimal(value) <= 0:
                raise serializers.ValidationError("La cantidad debe ser mayor que cero.")
        except (ValueError, TypeError, ArithmeticError):
            raise serializers.ValidationError("La cantidad debe ser un numero positivo.")
        return value

    def get_allergy_warnings(self, obj):
        prescription = getattr(obj, "prescription", None)
        if not prescription:
            return []
        return find_allergy_conflicts(prescription.patient, obj.medication_name)


class PrescriptionListSerializer(serializers.ModelSerializer):
    clinic_nombre = serializers.CharField(source="clinic.nombre", read_only=True)
    patient_nombre = serializers.CharField(source="patient.nombre_completo", read_only=True)
    doctor_nombre = serializers.CharField(source="doctor.user.nombre_completo", read_only=True)
    medications = serializers.SerializerMethodField()

    class Meta:
        model = Prescription
        fields = [
            "id", "clinic", "clinic_nombre", "patient", "patient_nombre", "doctor", "doctor_nombre",
            "consultation", "prescription_number", "issue_date", "general_instructions", "status",
            "prescription_type", "max_dispenses", "refill_interval_days", "expires_at", "dispenses_used",
            "issued_at", "issued_by", "medications", "activo", "creado_en", "actualizado_en",
        ]

    def get_medications(self, obj):
        return [item.medication_name for item in obj.items.filter(activo=True)[:4]]


class PrescriptionDetailSerializer(PrescriptionListSerializer):
    items = PrescriptionItemSerializer(many=True, read_only=True)

    class Meta(PrescriptionListSerializer.Meta):
        fields = PrescriptionListSerializer.Meta.fields + [
            "void_reason", "voided_at", "voided_by", "allergy_reviewed_at", "allergy_reviewed_by",
            "allergy_override_reason", "items",
        ]


class PrescriptionCreateSerializer(serializers.ModelSerializer):
    medications = PrescriptionItemSerializer(many=True, write_only=True, required=False)
    visit = serializers.IntegerField(required=False, write_only=True)
    notes = serializers.CharField(required=False, allow_blank=True, write_only=True, max_length=2000)

    class Meta:
        model = Prescription
        fields = [
            "id", "consultation", "prescription_number", "issue_date", "general_instructions", "status",
            "prescription_type", "max_dispenses", "refill_interval_days", "expires_at", "medications", "visit", "notes",
        ]
        read_only_fields = ["id"]
        extra_kwargs = {"prescription_number": {"required": False}}

    def validate(self, attrs):
        attrs.pop("visit", None)
        notes = attrs.pop("notes", "").strip()
        if notes:
            instructions = attrs.get("general_instructions", "").strip()
            attrs["general_instructions"] = f"{instructions}\nNotas: {notes}".strip()
        consultation = attrs["consultation"]
        validate_doctor_can_manage(self.context["request"].user, consultation)
        if consultation.status != ClinicalConsultation.Status.BORRADOR:
            raise serializers.ValidationError("Solo puedes crear recetas en una consulta activa.")
        medications = attrs.get("medications", [])
        for item in medications:
            item_serializer = PrescriptionItemSerializer(data=item, context={})
            item_serializer.is_valid(raise_exception=True)
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        medications = validated_data.pop("medications", [])
        prescription = super().create(validated_data)
        for item in medications:
            PrescriptionItem.objects.create(prescription=prescription, **item)
        return prescription


class PrescriptionUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prescription
        fields = ["issue_date", "general_instructions", "prescription_type", "max_dispenses", "refill_interval_days", "expires_at", "activo"]

    def validate(self, attrs):
        validate_doctor_can_manage(self.context["request"].user, self.instance.consultation)
        if self.instance.status == Prescription.Status.EMITIDA:
            raise serializers.ValidationError("No puedes editar una receta emitida.")
        return attrs


class PrescriptionIssueSerializer(serializers.Serializer):
    confirm_allergies = serializers.BooleanField(default=False)
    allergy_override_reason = serializers.CharField(required=False, allow_blank=True, max_length=500)


class PrescriptionVoidSerializer(serializers.Serializer):
    reason = serializers.CharField(required=True, allow_blank=False, min_length=5, max_length=500)


class MedicalOrderListSerializer(serializers.ModelSerializer):
    clinic_nombre = serializers.CharField(source="clinic.nombre", read_only=True)
    patient_nombre = serializers.CharField(source="patient.nombre_completo", read_only=True)
    doctor_nombre = serializers.CharField(source="doctor.user.nombre_completo", read_only=True)
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = MedicalOrder
        fields = [
            "id", "clinic", "clinic_nombre", "patient", "patient_nombre", "doctor", "doctor_nombre",
            "consultation", "order_number", "order_type", "title", "description", "instructions",
            "priority", "status", "is_expired", "expires_at", "scheduled_at", "responsible_user", "execution_area",
            "started_at", "completed_at", "result_summary", "reviewed_at", "reviewed_by", "review_notes",
            "cancellation_reason", "cancelled_at", "cancelled_by", "activo", "creado_en", "actualizado_en",
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.is_expired:
            data["status"] = MedicalOrder.Status.VENCIDA
        return data


class MedicalOrderDetailSerializer(MedicalOrderListSerializer):
    pass


class MedicalOrderCreateSerializer(serializers.ModelSerializer):
    title = serializers.CharField(required=False, allow_blank=True, max_length=180)
    order_type = serializers.CharField(required=False)
    priority = serializers.CharField(required=False)
    visit = serializers.IntegerField(required=False, write_only=True)
    notes = serializers.CharField(required=False, allow_blank=True, write_only=True, max_length=2000)

    class Meta:
        model = MedicalOrder
        fields = ["id", "consultation", "order_number", "order_type", "title", "description", "instructions", "priority", "expires_at", "scheduled_at", "execution_area", "visit", "notes"]
        read_only_fields = ["id"]
        extra_kwargs = {"order_number": {"required": False}}

    def validate(self, attrs):
        attrs.pop("visit", None)
        notes = attrs.pop("notes", "").strip()
        if notes:
            instructions = attrs.get("instructions", "").strip()
            attrs["instructions"] = f"{instructions}\nNotas: {notes}".strip()
        if not attrs.get("title", "").strip():
            if attrs.get("description", "").strip():
                attrs["title"] = attrs["description"].strip()[:180]
            else:
                raise serializers.ValidationError({"title": "El titulo o descripcion de la orden es obligatorio."})
        consultation = attrs["consultation"]
        validate_doctor_can_manage(self.context["request"].user, consultation)
        if consultation.status != ClinicalConsultation.Status.BORRADOR:
            raise serializers.ValidationError("Solo puedes crear ordenes en una consulta activa.")
        return attrs

    def validate_order_type(self, value):
        mapped = {"imagen": MedicalOrder.Type.IMAGENOLOGIA, "referencia": MedicalOrder.Type.INTERCONSULTA, "otra": MedicalOrder.Type.OTRO}.get(value, value)
        if mapped not in MedicalOrder.Type.values:
            raise serializers.ValidationError("Tipo de orden no valido.")
        return mapped

    def validate_priority(self, value):
        mapped = {"prioritaria": MedicalOrder.Priority.ALTA}.get(value, value)
        if mapped not in MedicalOrder.Priority.values:
            raise serializers.ValidationError("Prioridad no valida.")
        return mapped


class MedicalOrderUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicalOrder
        fields = ["order_type", "title", "description", "instructions", "priority", "expires_at", "scheduled_at", "execution_area"]

    def validate(self, attrs):
        validate_doctor_can_manage(self.context["request"].user, self.instance.consultation)
        if self.instance.status != MedicalOrder.Status.PENDIENTE or self.instance.started_at:
            raise serializers.ValidationError("No puedes editar una orden que ya inicio su ejecucion.")
        return attrs


class MedicalOrderStartSerializer(serializers.Serializer):
    pass


class MedicalOrderCompleteSerializer(serializers.Serializer):
    result_summary = serializers.CharField(required=True, allow_blank=False, min_length=3, max_length=4000)


class MedicalOrderReviewSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True, max_length=2000)


class MedicalOrderCancelSerializer(serializers.Serializer):
    reason = serializers.CharField(required=True, allow_blank=False, min_length=5, max_length=500)


class PrescriptionStatsSerializer(serializers.Serializer):
    total_prescriptions = serializers.IntegerField()
    draft_prescriptions = serializers.IntegerField()
    issued_prescriptions = serializers.IntegerField()
    voided_prescriptions = serializers.IntegerField()
    total_orders = serializers.IntegerField()
    pending_orders = serializers.IntegerField()
    completed_orders = serializers.IntegerField()
    cancelled_orders = serializers.IntegerField()
