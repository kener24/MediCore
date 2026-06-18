from rest_framework import serializers

from apps.audit.models import AuditLog


class AuditLogListSerializer(serializers.ModelSerializer):
    clinic_nombre = serializers.CharField(source="clinic.nombre", read_only=True)
    user_nombre = serializers.CharField(source="user.nombre_completo", read_only=True)
    user_email = serializers.SerializerMethodField()
    user_role = serializers.SerializerMethodField()
    model_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "clinic",
            "clinic_nombre",
            "user",
            "user_nombre",
            "user_email",
            "user_role",
            "action",
            "module",
            "object_type",
            "model_name",
            "object_id",
            "object_repr",
            "description",
            "status",
            "severity",
            "ip_address",
            "request_method",
            "request_path",
            "created_at",
        ]

    def get_user_email(self, obj):
        return obj.user_email or getattr(obj.user, "email", "")

    def get_user_role(self, obj):
        return obj.user_role or getattr(getattr(obj.user, "role", None), "nombre", "")

    def get_model_name(self, obj):
        return obj.object_type or obj.model_name


class AuditLogDetailSerializer(AuditLogListSerializer):
    class Meta(AuditLogListSerializer.Meta):
        fields = AuditLogListSerializer.Meta.fields + [
            "user_agent",
            "before_data",
            "after_data",
            "changes",
            "old_values",
            "new_values",
            "metadata",
        ]


class AuditLogStatsSerializer(serializers.Serializer):
    total_logs = serializers.IntegerField()
    logs_today = serializers.IntegerField()
    warnings = serializers.IntegerField()
    errors = serializers.IntegerField()
    critical = serializers.IntegerField()
    login_success = serializers.IntegerField()
    login_failed = serializers.IntegerField()
    failed = serializers.IntegerField(required=False)
    top_actions = serializers.ListField()
    top_modules = serializers.ListField()


class AuditFilterSerializer(serializers.Serializer):
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)
    clinic = serializers.IntegerField(required=False)
    user = serializers.IntegerField(required=False)
    action = serializers.CharField(required=False)
    module = serializers.CharField(required=False)
    severity = serializers.CharField(required=False)
    status = serializers.CharField(required=False)
    object_type = serializers.CharField(required=False)
    model_name = serializers.CharField(required=False)
    object_id = serializers.CharField(required=False)
    search = serializers.CharField(required=False)

    def validate(self, attrs):
        if attrs.get("date_from") and attrs.get("date_to") and attrs["date_from"] > attrs["date_to"]:
            raise serializers.ValidationError("date_from no puede ser mayor que date_to.")
        return attrs
