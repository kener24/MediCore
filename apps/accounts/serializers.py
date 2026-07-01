from django.contrib.auth import password_validation
from django.utils import timezone
from rest_framework import serializers

from apps.accounts.models import Role, User
from apps.clinics.models import Clinic
from apps.core.validators import validate_digits_identifier, validate_phone
from apps.security.services import validate_password_policy
from apps.subscriptions.services import ensure_can_create_user


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ["id", "nombre", "descripcion", "activo", "creado_en", "actualizado_en"]
        read_only_fields = fields


class UserListSerializer(serializers.ModelSerializer):
    role_nombre = serializers.CharField(source="role.nombre", read_only=True)
    clinica_nombre = serializers.CharField(source="clinica.nombre", read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "nombre_completo",
            "email",
            "telefono",
            "avatar_url",
            "role",
            "role_nombre",
            "clinica",
            "clinica_nombre",
            "is_active",
            "ultimo_acceso",
            "email_verified",
            "last_login_ip",
            "password_changed_at",
            "date_joined",
        ]


class UserDetailSerializer(UserListSerializer):
    class Meta(UserListSerializer.Meta):
        fields = UserListSerializer.Meta.fields + ["is_staff", "is_superuser", "creado_en", "actualizado_en"]


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={"input_type": "password"})

    class Meta:
        model = User
        fields = [
            "id",
            "clinica",
            "role",
            "nombre_completo",
            "email",
            "telefono",
            "avatar_url",
            "password",
            "is_active",
            "is_staff",
            "is_superuser",
        ]
        read_only_fields = ["id"]

    def validate_email(self, value):
        email = User.objects.normalize_email(value)
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("Ya existe un usuario con este email.")
        return email

    def validate_telefono(self, value):
        return validate_phone(value)

    def validate(self, attrs):
        request = self.context.get("request")
        role = attrs.get("role")
        clinica = attrs.get("clinica")

        if not attrs.get("nombre_completo"):
            raise serializers.ValidationError({"nombre_completo": "Este campo es obligatorio."})
        if not role:
            raise serializers.ValidationError({"role": "Este campo es obligatorio."})
        if role.nombre != "superadmin" and not clinica:
            raise serializers.ValidationError({"clinica": "La clínica es obligatoria excepto para superadmin."})
        if role.nombre == "superadmin":
            attrs["clinica"] = None

        if request and request.user.is_authenticated:
            requester_role = getattr(request.user.role, "nombre", None)
            if role.nombre == "superadmin" and not (request.user.is_superuser or requester_role == "superadmin"):
                raise serializers.ValidationError({"role": "No tienes permiso para asignar el rol superadmin."})
            if requester_role == "admin":
                if role.nombre == "superadmin":
                    raise serializers.ValidationError({"role": "Un admin no puede crear superadmin."})
                attrs["clinica"] = request.user.clinica
        if attrs.get("clinica"):
            try:
                ensure_can_create_user(attrs["clinica"])
            except ValueError as exc:
                raise serializers.ValidationError({"clinica": str(exc)})

        password_validation.validate_password(attrs["password"])
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        return User.objects.create_user(password=password, **validated_data)


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "clinica",
            "role",
            "nombre_completo",
            "email",
            "telefono",
            "avatar_url",
            "is_active",
            "is_staff",
            "is_superuser",
        ]

    def validate_email(self, value):
        email = User.objects.normalize_email(value)
        qs = User.objects.filter(email__iexact=email)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Ya existe un usuario con este email.")
        return email

    def validate_telefono(self, value):
        return validate_phone(value)

    def validate(self, attrs):
        role = attrs.get("role", getattr(self.instance, "role", None))
        clinica = attrs.get("clinica", getattr(self.instance, "clinica", None))
        request = self.context.get("request")

        if role and role.nombre != "superadmin" and not clinica:
            raise serializers.ValidationError({"clinica": "La clínica es obligatoria excepto para superadmin."})
        if role and role.nombre == "superadmin":
            attrs["clinica"] = None

        if request and request.user.is_authenticated:
            requester_role = getattr(request.user.role, "nombre", None)
            if role and role.nombre == "superadmin" and not (request.user.is_superuser or requester_role == "superadmin"):
                raise serializers.ValidationError({"role": "No tienes permiso para asignar el rol superadmin."})
            if requester_role == "admin":
                attrs["clinica"] = request.user.clinica
                attrs.pop("is_staff", None)
                attrs.pop("is_superuser", None)

        return attrs


class MeSerializer(UserDetailSerializer):
    pass


class MeUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["nombre_completo", "telefono", "avatar_url"]

    def validate_nombre_completo(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("El nombre completo es obligatorio.")
        return value.strip()

    def validate_telefono(self, value):
        return validate_phone(value)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True, required=True)
    new_password = serializers.CharField(write_only=True, required=True)
    confirm_password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    def to_internal_value(self, data):
        data = data.copy()
        if "old_password" not in data and data.get("current_password"):
            data["old_password"] = data.get("current_password")
        return super().to_internal_value(data)

    def validate(self, attrs):
        confirm_password = attrs.get("confirm_password")
        if confirm_password and confirm_password != attrs.get("new_password"):
            raise serializers.ValidationError({"confirm_password": "La confirmacion no coincide."})
        return attrs

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("La contraseña actual no es correcta.")
        return value

    def validate_new_password(self, value):
        result = validate_password_policy(value, self.context["request"].user)
        if not result["valid"]:
            raise serializers.ValidationError(result["errors"])
        return value

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.password_changed_at = timezone.now()
        user.save(update_fields=["password", "password_changed_at"])
        return user


class MyClinicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Clinic
        fields = [
            "id",
            "nombre",
            "rtn",
            "telefono",
            "correo",
            "direccion",
            "activo",
            "creado_en",
            "actualizado_en",
        ]
        read_only_fields = ["id", "activo", "creado_en", "actualizado_en"]

    def validate_rtn(self, value):
        return validate_digits_identifier(value, "El RTN", min_length=8, max_length=20)

    def validate_telefono(self, value):
        return validate_phone(value)


class ClinicAdminUserCreateSerializer(serializers.ModelSerializer):
    role = serializers.CharField()
    password = serializers.CharField(write_only=True, required=True, min_length=8)

    class Meta:
        model = User
        fields = ["id", "nombre_completo", "email", "telefono", "role", "password", "is_active"]
        read_only_fields = ["id"]

    def validate_email(self, value):
        email = User.objects.normalize_email(value)
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("Ya existe un usuario con este email.")
        return email

    def validate_telefono(self, value):
        return validate_phone(value)

    def validate_role(self, value):
        allowed = ["admin", "medico", "enfermera", "recepcionista", "paciente"]
        if value not in allowed:
            raise serializers.ValidationError("No puedes crear usuarios con este rol.")
        return value

    def validate(self, attrs):
        request = self.context["request"]
        if getattr(request.user.role, "nombre", None) == "admin" and not request.user.clinica_id:
            raise serializers.ValidationError("El admin autenticado no tiene clínica asignada.")
        password_validation.validate_password(attrs["password"], request.user)
        try:
            ensure_can_create_user(request.user.clinica)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc))
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        role_name = validated_data.pop("role")
        password = validated_data.pop("password")
        role = Role.objects.get(nombre=role_name)
        clinic = request.user.clinica
        if getattr(request.user.role, "nombre", None) == "superadmin":
            clinic_id = self.context.get("clinic_id")
            if clinic_id:
                clinic = Clinic.objects.get(id=clinic_id)
        return User.objects.create_user(password=password, role=role, clinica=clinic, **validated_data)


class ClinicAdminUserUpdateSerializer(serializers.ModelSerializer):
    role = serializers.CharField(required=False)

    class Meta:
        model = User
        fields = ["nombre_completo", "email", "telefono", "role", "is_active"]

    def validate_email(self, value):
        email = User.objects.normalize_email(value)
        qs = User.objects.filter(email__iexact=email)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Ya existe un usuario con este email.")
        return email

    def validate_telefono(self, value):
        return validate_phone(value)

    def validate_role(self, value):
        allowed = ["admin", "medico", "enfermera", "recepcionista", "paciente"]
        if value not in allowed:
            raise serializers.ValidationError("No puedes asignar este rol.")
        return value

    def update(self, instance, validated_data):
        role_name = validated_data.pop("role", None)
        if role_name:
            validated_data["role"] = Role.objects.get(nombre=role_name)
        return super().update(instance, validated_data)
