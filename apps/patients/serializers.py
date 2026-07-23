from django.utils import timezone
from rest_framework import serializers

from apps.accounts.permissions import get_role_name
from apps.clinics.models import Clinic
from apps.core.validators import validate_digits_identifier, validate_phone
from apps.patients.models import Patient
from apps.subscriptions.services import ensure_can_create_patient
from apps.clinic_settings.models import get_or_create_workflow_settings


class PatientListSerializer(serializers.ModelSerializer):
    clinic_nombre = serializers.CharField(source="clinic.nombre", read_only=True)

    class Meta:
        model = Patient
        fields = [
            "id",
            "clinic",
            "clinic_nombre",
            "user",
            "codigo_paciente",
            "nombres",
            "apellidos",
            "nombre_completo",
            "identidad",
            "fecha_nacimiento",
            "genero",
            "tipo_sangre",
            "telefono",
            "correo",
            "activo",
            "creado_en",
            "actualizado_en",
        ]


class PatientDetailSerializer(PatientListSerializer):
    class Meta(PatientListSerializer.Meta):
        fields = PatientListSerializer.Meta.fields + [
            "direccion",
            "ciudad",
            "departamento",
            "pais",
            "contacto_emergencia_nombre",
            "contacto_emergencia_telefono",
            "contacto_emergencia_parentesco",
            "alergias",
            "enfermedades_cronicas",
            "observaciones",
        ]


class PatientCreateSerializer(serializers.ModelSerializer):
    duplicate_warning_confirmed = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = Patient
        fields = [
            "id",
            "clinic",
            "user",
            "codigo_paciente",
            "nombres",
            "apellidos",
            "identidad",
            "fecha_nacimiento",
            "genero",
            "tipo_sangre",
            "telefono",
            "correo",
            "direccion",
            "ciudad",
            "departamento",
            "pais",
            "contacto_emergencia_nombre",
            "contacto_emergencia_telefono",
            "contacto_emergencia_parentesco",
            "alergias",
            "enfermedades_cronicas",
            "observaciones",
            "activo",
            "duplicate_warning_confirmed",
        ]
        read_only_fields = ["id"]
        extra_kwargs = {
            "clinic": {"required": False},
            "codigo_paciente": {"required": False},
        }
        validators = []

    def validate_identidad(self, value):
        return validate_digits_identifier(value, "La identidad", min_length=8, max_length=20)

    def validate_telefono(self, value):
        return validate_phone(value)

    def validate_contacto_emergencia_telefono(self, value):
        return validate_phone(value)

    def validate_fecha_nacimiento(self, value):
        if value and value > timezone.localdate():
            raise serializers.ValidationError("La fecha de nacimiento no puede estar en el futuro.")
        return value

    def _resolve_clinic(self, attrs):
        request = self.context["request"]
        role = get_role_name(request.user)
        if role == "superadmin" or request.user.is_superuser:
            raise serializers.ValidationError({"clinic": "Superadmin no puede crear pacientes clinicos."})
        if not request.user.clinica_id:
            raise serializers.ValidationError({"clinic": "El usuario autenticado no tiene clinica asignada."})
        return request.user.clinica

    def validate(self, attrs):
        clinic = self._resolve_clinic(attrs)
        attrs["clinic"] = clinic
        role = get_role_name(self.context["request"].user)
        workflow = get_or_create_workflow_settings(clinic)
        if role == "recepcionista" and not workflow.reception_can_create_minimal_patient:
            raise serializers.ValidationError("Recepción no puede crear pacientes básicos en esta clínica.")
        if workflow.require_identity_for_patient and not attrs.get("identidad"):
            raise serializers.ValidationError({"identidad": "La identidad es obligatoria para esta clínica."})
        if workflow.require_phone_for_patient and not attrs.get("telefono"):
            raise serializers.ValidationError({"telefono": "El teléfono es obligatorio para esta clínica."})
        identidad = attrs.get("identidad")
        codigo = attrs.get("codigo_paciente")
        if identidad and Patient.objects.filter(clinic=clinic, identidad=identidad).exists():
            raise serializers.ValidationError({"identidad": "Ya existe un paciente con esa identidad en esta clinica."})
        possible_duplicates = Patient.objects.filter(clinic=clinic, activo=True)
        telefono = attrs.get("telefono")
        probable = Patient.objects.none()
        if telefono:
            probable = possible_duplicates.filter(telefono=telefono)
        fecha_nacimiento = attrs.get("fecha_nacimiento")
        if attrs.get("nombres") and attrs.get("apellidos") and fecha_nacimiento:
            probable = probable | possible_duplicates.filter(
                nombres__iexact=attrs["nombres"].strip(),
                apellidos__iexact=attrs["apellidos"].strip(),
                fecha_nacimiento=fecha_nacimiento,
            )
        if probable.exists() and not attrs.get("duplicate_warning_confirmed"):
            raise serializers.ValidationError({
                "possible_duplicate": "Encontramos un paciente con información similar. Revisa el registro antes de crear uno nuevo."
            })
        if codigo and Patient.objects.filter(clinic=clinic, codigo_paciente=codigo).exists():
            raise serializers.ValidationError({"codigo_paciente": "Ya existe un paciente con ese codigo en esta clinica."})
        user = attrs.get("user")
        if user:
            if get_role_name(user) != "paciente":
                raise serializers.ValidationError({"user": "El usuario vinculado debe tener rol paciente."})
            if user.clinica_id != clinic.id:
                raise serializers.ValidationError({"user": "El usuario debe pertenecer a la misma clinica."})
        try:
            ensure_can_create_patient(clinic)
        except ValueError as exc:
            raise serializers.ValidationError({"clinic": str(exc)})
        return attrs

    def create(self, validated_data):
        validated_data.pop("duplicate_warning_confirmed", None)
        return super().create(validated_data)


class PatientUpdateSerializer(PatientCreateSerializer):
    def validate(self, attrs):
        clinic = self.instance.clinic
        request = self.context["request"]
        if get_role_name(request.user) == "superadmin" or request.user.is_superuser:
            raise serializers.ValidationError({"clinic": "Superadmin no puede editar pacientes clinicos."})
        attrs["clinic"] = clinic
        identidad = attrs.get("identidad")
        codigo = attrs.get("codigo_paciente")
        if identidad:
            qs = Patient.objects.filter(clinic=clinic, identidad=identidad).exclude(id=self.instance.id)
            if qs.exists():
                raise serializers.ValidationError({"identidad": "Ya existe un paciente con esa identidad en esta clinica."})
        if codigo:
            qs = Patient.objects.filter(clinic=clinic, codigo_paciente=codigo).exclude(id=self.instance.id)
            if qs.exists():
                raise serializers.ValidationError({"codigo_paciente": "Ya existe un paciente con ese codigo en esta clinica."})
        user = attrs.get("user")
        if user:
            if get_role_name(user) != "paciente":
                raise serializers.ValidationError({"user": "El usuario vinculado debe tener rol paciente."})
            if user.clinica_id != clinic.id:
                raise serializers.ValidationError({"user": "El usuario debe pertenecer a la misma clinica."})
        return attrs


class PatientMeSerializer(PatientDetailSerializer):
    pass


class PatientStatsSerializer(serializers.Serializer):
    total_patients = serializers.IntegerField()
    active_patients = serializers.IntegerField()
    inactive_patients = serializers.IntegerField()
    male_patients = serializers.IntegerField()
    female_patients = serializers.IntegerField()
    other_patients = serializers.IntegerField()
