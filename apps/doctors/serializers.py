from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from apps.accounts.models import User
from apps.accounts.permissions import get_role_name
from apps.doctors.models import DoctorProfile, DoctorSchedule, MedicalSpecialty
from apps.subscriptions.services import ensure_can_create_doctor


class MedicalSpecialtySerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicalSpecialty
        fields = ["id", "nombre", "descripcion", "activo", "creado_en", "actualizado_en"]
        read_only_fields = ["id", "creado_en", "actualizado_en"]


class DoctorProfileListSerializer(serializers.ModelSerializer):
    user_nombre = serializers.CharField(source="user.nombre_completo", read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_telefono = serializers.CharField(source="user.telefono", read_only=True)
    clinic_nombre = serializers.CharField(source="clinic.nombre", read_only=True)
    specialty_nombre = serializers.CharField(source="specialty.nombre", read_only=True)

    class Meta:
        model = DoctorProfile
        fields = [
            "id",
            "clinic",
            "clinic_nombre",
            "user",
            "user_nombre",
            "user_email",
            "user_telefono",
            "specialty",
            "specialty_nombre",
            "numero_colegiacion",
            "titulo_profesional",
            "tarifa_consulta",
            "duracion_consulta_minutos",
            "atiende_virtual",
            "atiende_presencial",
            "activo",
            "creado_en",
            "actualizado_en",
        ]


class DoctorScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorSchedule
        fields = ["id", "doctor", "dia_semana", "hora_inicio", "hora_fin", "activo", "creado_en", "actualizado_en"]
        read_only_fields = ["id", "doctor", "creado_en", "actualizado_en"]

    def validate(self, attrs):
        instance = DoctorSchedule(
            doctor=self.context["doctor"],
            dia_semana=attrs.get("dia_semana", getattr(self.instance, "dia_semana", None)),
            hora_inicio=attrs.get("hora_inicio", getattr(self.instance, "hora_inicio", None)),
            hora_fin=attrs.get("hora_fin", getattr(self.instance, "hora_fin", None)),
            activo=attrs.get("activo", getattr(self.instance, "activo", True)),
        )
        if self.instance:
            instance.pk = self.instance.pk
        try:
            instance.clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages)
        return attrs

    def create(self, validated_data):
        return DoctorSchedule.objects.create(doctor=self.context["doctor"], **validated_data)


class DoctorProfileDetailSerializer(DoctorProfileListSerializer):
    schedules = DoctorScheduleSerializer(many=True, read_only=True)

    class Meta(DoctorProfileListSerializer.Meta):
        fields = DoctorProfileListSerializer.Meta.fields + ["biografia", "schedules"]


class DoctorProfileCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorProfile
        fields = [
            "id",
            "user",
            "specialty",
            "numero_colegiacion",
            "titulo_profesional",
            "biografia",
            "tarifa_consulta",
            "duracion_consulta_minutos",
            "atiende_virtual",
            "atiende_presencial",
            "activo",
        ]
        read_only_fields = ["id"]

    def validate(self, attrs):
        request = self.context["request"]
        user = attrs["user"]
        specialty = attrs["specialty"]
        if get_role_name(user) != "medico":
            raise serializers.ValidationError({"user": "Solo usuarios con rol medico pueden tener perfil medico."})
        if DoctorProfile.objects.filter(user=user).exists():
            raise serializers.ValidationError({"user": "Este usuario ya tiene perfil medico."})
        if not specialty.activo:
            raise serializers.ValidationError({"specialty": "La especialidad debe estar activa."})
        if get_role_name(request.user) == "admin" and user.clinica_id != request.user.clinica_id:
            raise serializers.ValidationError({"user": "No puedes crear perfil medico para otra clinica."})
        if attrs.get("tarifa_consulta", 0) < 0:
            raise serializers.ValidationError({"tarifa_consulta": "La tarifa no puede ser negativa."})
        if attrs.get("duracion_consulta_minutos", 0) <= 0:
            raise serializers.ValidationError({"duracion_consulta_minutos": "La duracion debe ser mayor que 0."})
        attrs["clinic"] = user.clinica
        try:
            ensure_can_create_doctor(user.clinica)
        except ValueError as exc:
            raise serializers.ValidationError({"clinic": str(exc)})
        return attrs


class DoctorProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorProfile
        fields = [
            "specialty",
            "numero_colegiacion",
            "titulo_profesional",
            "biografia",
            "tarifa_consulta",
            "duracion_consulta_minutos",
            "atiende_virtual",
            "atiende_presencial",
            "activo",
        ]

    def validate(self, attrs):
        specialty = attrs.get("specialty")
        if specialty and not specialty.activo:
            raise serializers.ValidationError({"specialty": "La especialidad debe estar activa."})
        if attrs.get("tarifa_consulta", 0) < 0:
            raise serializers.ValidationError({"tarifa_consulta": "La tarifa no puede ser negativa."})
        if "duracion_consulta_minutos" in attrs and attrs["duracion_consulta_minutos"] <= 0:
            raise serializers.ValidationError({"duracion_consulta_minutos": "La duracion debe ser mayor que 0."})
        return attrs


class DoctorDashboardSerializer(serializers.Serializer):
    doctor = serializers.DictField()
    schedules = DoctorScheduleSerializer(many=True)
