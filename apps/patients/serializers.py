from rest_framework import serializers

from apps.accounts.permissions import get_role_name
from apps.clinics.models import Clinic
from apps.patients.models import Patient
from apps.subscriptions.services import ensure_can_create_patient


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
        ]
        read_only_fields = ["id"]
        extra_kwargs = {
            "clinic": {"required": False},
            "codigo_paciente": {"required": False},
        }
        validators = []

    def _resolve_clinic(self, attrs):
        request = self.context["request"]
        role = get_role_name(request.user)
        if role == "superadmin":
            clinic = attrs.get("clinic")
            if not clinic:
                raise serializers.ValidationError({"clinic": "La clinica es obligatoria para superadmin."})
            return clinic
        if not request.user.clinica_id:
            raise serializers.ValidationError({"clinic": "El usuario autenticado no tiene clinica asignada."})
        return request.user.clinica

    def validate(self, attrs):
        clinic = self._resolve_clinic(attrs)
        attrs["clinic"] = clinic
        identidad = attrs.get("identidad")
        codigo = attrs.get("codigo_paciente")
        if identidad and Patient.objects.filter(clinic=clinic, identidad=identidad).exists():
            raise serializers.ValidationError({"identidad": "Ya existe un paciente con esa identidad en esta clinica."})
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


class PatientUpdateSerializer(PatientCreateSerializer):
    def validate(self, attrs):
        clinic = self.instance.clinic
        request = self.context["request"]
        if get_role_name(request.user) == "superadmin" and attrs.get("clinic"):
            clinic = attrs["clinic"]
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
