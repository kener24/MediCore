from rest_framework import serializers

from apps.appointments.models import Appointment
from apps.billing.models import Invoice
from apps.documents.models import ClinicalDocument, DocumentCategory
from apps.documents.permissions import can_upload_for_patient
from apps.documents.utils import calculate_checksum, file_extension, validate_document_file
from apps.medical_records.models import ClinicalConsultation, MedicalRecord
from apps.patients.models import Patient
from apps.prescriptions.models import MedicalOrder, Prescription


class DocumentCategorySerializer(serializers.ModelSerializer):
    clinic_nombre = serializers.CharField(source="clinic.nombre", read_only=True)

    class Meta:
        model = DocumentCategory
        fields = ["id", "clinic", "clinic_nombre", "name", "description", "document_type", "active", "creado_en", "actualizado_en"]
        read_only_fields = ["id", "clinic_nombre", "creado_en", "actualizado_en"]


class DocumentCategoryCreateSerializer(DocumentCategorySerializer):
    pass


class ClinicalDocumentListSerializer(serializers.ModelSerializer):
    clinic_nombre = serializers.CharField(source="clinic.nombre", read_only=True)
    patient_nombre = serializers.CharField(source="patient.nombre_completo", read_only=True)
    patient_codigo = serializers.CharField(source="patient.codigo_paciente", read_only=True)
    category_nombre = serializers.CharField(source="category.name", read_only=True)
    document_type = serializers.CharField(read_only=True)
    uploaded_by_nombre = serializers.CharField(source="uploaded_by.nombre_completo", read_only=True)

    class Meta:
        model = ClinicalDocument
        fields = [
            "id", "clinic", "clinic_nombre", "patient", "patient_nombre", "patient_codigo", "category",
            "category_nombre", "document_type", "title", "description", "original_filename", "file_type",
            "mime_type", "file_size", "file_extension", "storage_backend", "uploaded_by",
            "uploaded_by_nombre", "visible_to_patient", "is_sensitive", "status", "version",
            "replaced_by", "tags", "active", "creado_en", "actualizado_en",
        ]


class ClinicalDocumentDetailSerializer(ClinicalDocumentListSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta(ClinicalDocumentListSerializer.Meta):
        fields = ClinicalDocumentListSerializer.Meta.fields + [
            "medical_record", "consultation", "appointment", "prescription", "medical_order", "invoice",
            "checksum", "notes", "file_url",
        ]

    def get_file_url(self, obj) -> str | None:
        request = self.context.get("request")
        if not request:
            return None
        return request.build_absolute_uri(f"/api/documents/{obj.id}/download/")


class ClinicalDocumentCreateSerializer(serializers.ModelSerializer):
    file = serializers.FileField(write_only=True)

    class Meta:
        model = ClinicalDocument
        fields = [
            "id", "patient", "medical_record", "consultation", "appointment", "prescription",
            "medical_order", "invoice", "category", "title", "description", "file",
            "visible_to_patient", "is_sensitive", "tags", "notes",
        ]
        read_only_fields = ["id"]

    def validate(self, attrs):
        request = self.context["request"]
        uploaded_file = attrs.get("file")
        if not uploaded_file:
            raise serializers.ValidationError({"file": "El archivo es obligatorio."})
        try:
            ext = validate_document_file(uploaded_file)
        except ValueError as exc:
            raise serializers.ValidationError({"file": str(exc)})
        patient = attrs.get("patient")
        if not patient:
            raise serializers.ValidationError({"patient": "El paciente es obligatorio."})
        category = attrs.get("category")
        document_type = category.document_type if category else DocumentCategory.Type.OTHER
        if not can_upload_for_patient(request.user, patient, document_type=document_type, is_sensitive=attrs.get("is_sensitive", False)):
            raise serializers.ValidationError({"patient": "No tienes permiso para subir documentos de este paciente."})
        self._validate_related(attrs, patient)
        attrs["_file_extension"] = ext
        return attrs

    def _validate_related(self, attrs, patient):
        related_fields = {
            "medical_record": MedicalRecord,
            "consultation": ClinicalConsultation,
            "appointment": Appointment,
            "prescription": Prescription,
            "medical_order": MedicalOrder,
            "invoice": Invoice,
        }
        for field in related_fields:
            obj = attrs.get(field)
            if not obj:
                continue
            if getattr(obj, "clinic_id", None) != patient.clinic_id:
                raise serializers.ValidationError({field: "Debe pertenecer a la misma clinica del paciente."})
            if getattr(obj, "patient_id", None) and obj.patient_id != patient.id:
                raise serializers.ValidationError({field: "Debe pertenecer al mismo paciente."})
        category = attrs.get("category")
        if category and category.clinic_id and category.clinic_id != patient.clinic_id:
            raise serializers.ValidationError({"category": "La categoria debe ser global o de la misma clinica."})

    def create(self, validated_data):
        uploaded_file = validated_data["file"]
        ext = validated_data.pop("_file_extension")
        if not validated_data.get("title"):
            validated_data["title"] = uploaded_file.name.rsplit(".", 1)[0][:220]
        validated_data["clinic"] = validated_data["patient"].clinic
        validated_data["uploaded_by"] = self.context["request"].user
        validated_data["original_filename"] = uploaded_file.name
        validated_data["file_extension"] = ext
        validated_data["file_type"] = ext
        validated_data["mime_type"] = getattr(uploaded_file, "content_type", "") or ""
        validated_data["file_size"] = uploaded_file.size
        validated_data["checksum"] = calculate_checksum(uploaded_file)
        return super().create(validated_data)


class ClinicalDocumentUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClinicalDocument
        fields = ["title", "description", "category", "visible_to_patient", "is_sensitive", "tags", "notes", "status", "active"]

    def validate_category(self, category):
        if category and category.clinic_id and self.instance and category.clinic_id != self.instance.clinic_id:
            raise serializers.ValidationError("La categoria debe ser global o de la misma clinica.")
        return category


class ClinicalDocumentReplaceSerializer(serializers.Serializer):
    file = serializers.FileField()
    title = serializers.CharField(required=False, allow_blank=True, max_length=220)
    description = serializers.CharField(required=False, allow_blank=True)
    visible_to_patient = serializers.BooleanField(required=False)
    is_sensitive = serializers.BooleanField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True)
    tags = serializers.ListField(child=serializers.CharField(), required=False)

    def validate_file(self, uploaded_file):
        try:
            validate_document_file(uploaded_file)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc))
        return uploaded_file


class ClinicalDocumentStatsSerializer(serializers.Serializer):
    total_documents = serializers.IntegerField()
    active_documents = serializers.IntegerField()
    archived_documents = serializers.IntegerField()
    deleted_documents = serializers.IntegerField()
    visible_to_patient = serializers.IntegerField()
    sensitive_documents = serializers.IntegerField()
    total_storage_mb = serializers.FloatField()
    documents_by_type = serializers.ListField()


class PatientPortalDocumentSerializer(serializers.ModelSerializer):
    category_nombre = serializers.CharField(source="category.name", read_only=True)
    document_type = serializers.CharField(read_only=True)

    class Meta:
        model = ClinicalDocument
        fields = [
            "id", "category", "category_nombre", "document_type", "title", "description",
            "original_filename", "mime_type", "file_size", "file_extension", "status",
            "version", "creado_en", "actualizado_en",
        ]
