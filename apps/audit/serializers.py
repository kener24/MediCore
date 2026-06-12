from rest_framework import serializers

from apps.audit.models import AuditLog


class AuditLogListSerializer(serializers.ModelSerializer):
    clinic_nombre = serializers.CharField(source="clinic.nombre", read_only=True)
    user_nombre = serializers.CharField(source="user.nombre_completo", read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = AuditLog
        fields = ["id", "clinic", "clinic_nombre", "user", "user_nombre", "user_email", "action", "module", "model_name", "object_id", "object_repr", "description", "severity", "ip_address", "request_method", "request_path", "created_at"]


class AuditLogDetailSerializer(AuditLogListSerializer):
    class Meta(AuditLogListSerializer.Meta):
        fields = AuditLogListSerializer.Meta.fields + ["user_agent", "old_values", "new_values", "metadata"]


class AuditLogStatsSerializer(serializers.Serializer):
    total_logs = serializers.IntegerField()
    logs_today = serializers.IntegerField()
    warnings = serializers.IntegerField()
    errors = serializers.IntegerField()
    critical = serializers.IntegerField()
    login_success = serializers.IntegerField()
    login_failed = serializers.IntegerField()
    top_actions = serializers.ListField()
    top_modules = serializers.ListField()


class AuditFilterSerializer(serializers.Serializer):
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)

    def validate(self, attrs):
        if attrs.get("date_from") and attrs.get("date_to") and attrs["date_from"] > attrs["date_to"]:
            raise serializers.ValidationError("date_from no puede ser mayor que date_to.")
        return attrs

