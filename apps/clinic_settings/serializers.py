from rest_framework import serializers

from apps.clinic_settings.models import ClinicSettings
from apps.clinics.models import Clinic


class ClinicSettingsSerializer(serializers.ModelSerializer):
    clinic_nombre = serializers.CharField(source="clinic.nombre", read_only=True)

    class Meta:
        model = ClinicSettings
        fields = "__all__"
        read_only_fields = ["id", "clinic", "clinic_nombre", "creado_en", "actualizado_en"]


class ClinicSettingsUpdateSerializer(ClinicSettingsSerializer):
    class Meta(ClinicSettingsSerializer.Meta):
        read_only_fields = ["id", "clinic", "clinic_nombre", "creado_en", "actualizado_en"]


class PublicClinicSettingsSerializer(serializers.ModelSerializer):
    clinic_id = serializers.IntegerField(source="clinic.id", read_only=True)
    clinic_name = serializers.CharField(source="clinic.nombre", read_only=True)
    clinic_phone = serializers.CharField(source="clinic.telefono", read_only=True)
    clinic_email = serializers.CharField(source="clinic.correo", read_only=True)
    clinic_address = serializers.CharField(source="clinic.direccion", read_only=True)

    class Meta:
        model = ClinicSettings
        fields = [
            "clinic_id",
            "clinic_name",
            "clinic_phone",
            "clinic_email",
            "clinic_address",
            "logo_url",
            "primary_color",
            "secondary_color",
            "accent_color",
            "currency",
            "language",
            "allow_patient_portal",
            "allow_online_appointments",
            "allow_patient_cancellations",
            "business_start_time",
            "business_end_time",
            "working_days",
            "terms_and_conditions",
            "privacy_policy",
        ]


class ClinicSettingsSummarySerializer(serializers.Serializer):
    total_clinics = serializers.IntegerField()
    configured_clinics = serializers.IntegerField()
    missing_settings = serializers.IntegerField()
    patient_portal_enabled = serializers.IntegerField()
    online_appointments_enabled = serializers.IntegerField()
