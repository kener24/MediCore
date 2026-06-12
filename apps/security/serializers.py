from rest_framework import serializers

from apps.security.models import AccountLock, LoginAttempt, SecuritySetting, UserSession
from apps.security.services import password_policy_dict, validate_password_policy


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    new_password = serializers.CharField()
    confirm_password = serializers.CharField()

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "La confirmacion no coincide."})
        return attrs


class EmailVerificationConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()


class LoginAttemptSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = LoginAttempt
        fields = ["id", "email", "user", "user_email", "success", "failure_reason", "ip_address", "user_agent", "created_at"]


class AccountLockSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source="user.email", read_only=True)
    user_nombre = serializers.CharField(source="user.nombre_completo", read_only=True)
    clinic = serializers.IntegerField(source="user.clinica_id", read_only=True)
    clinic_nombre = serializers.CharField(source="user.clinica.nombre", read_only=True)

    class Meta:
        model = AccountLock
        fields = ["id", "user", "user_email", "user_nombre", "clinic", "clinic_nombre", "locked_until", "reason", "failed_attempts", "active", "created_at", "unlocked_at", "unlocked_by"]


class UserSessionSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source="user.email", read_only=True)
    user_nombre = serializers.CharField(source="user.nombre_completo", read_only=True)
    current = serializers.SerializerMethodField()

    class Meta:
        model = UserSession
        fields = ["id", "user", "user_email", "user_nombre", "session_key", "ip_address", "user_agent", "device_name", "last_activity_at", "expires_at", "revoked_at", "active", "created_at", "current"]
        read_only_fields = fields

    def get_current(self, obj) -> bool:
        return self.context.get("current_session_key") == obj.session_key


class PasswordPolicySerializer(serializers.Serializer):
    min_length = serializers.IntegerField()
    require_uppercase = serializers.BooleanField()
    require_lowercase = serializers.BooleanField()
    require_number = serializers.BooleanField()
    require_symbol = serializers.BooleanField()


class PasswordPolicyValidateSerializer(serializers.Serializer):
    password = serializers.CharField()

    def validate(self, attrs):
        result = validate_password_policy(attrs["password"], self.context.get("user"))
        attrs["result"] = result
        return attrs


class SecuritySettingSerializer(serializers.ModelSerializer):
    clinic_nombre = serializers.CharField(source="clinic.nombre", read_only=True)

    class Meta:
        model = SecuritySetting
        fields = [
            "id", "clinic", "clinic_nombre", "password_min_length", "password_require_uppercase",
            "password_require_lowercase", "password_require_number", "password_require_symbol",
            "max_failed_login_attempts", "lockout_minutes", "password_reset_token_minutes",
            "email_verification_token_minutes", "session_lifetime_minutes", "require_email_verification",
            "active", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "clinic_nombre", "created_at", "updated_at"]


class EmailVerificationStatusSerializer(serializers.Serializer):
    email = serializers.EmailField()
    email_verified = serializers.BooleanField()


class AccountLockStatusSerializer(serializers.Serializer):
    locked = serializers.BooleanField()
    locked_until = serializers.DateTimeField(allow_null=True)
    reason = serializers.CharField(allow_blank=True)
    failed_attempts = serializers.IntegerField()


class RevokeAllSessionsSerializer(serializers.Serializer):
    keep_current = serializers.BooleanField(required=False, default=True)


class EmptySerializer(serializers.Serializer):
    pass


def policy_payload(clinic=None):
    return password_policy_dict(clinic)
