from rest_framework import serializers

from apps.accounts.permissions import get_role_name
from apps.notifications.models import Notification, NotificationPreference


class NotificationListSerializer(serializers.ModelSerializer):
    clinic_nombre = serializers.CharField(source="clinic.nombre", read_only=True)

    class Meta:
        model = Notification
        fields = ["id", "clinic", "clinic_nombre", "title", "message", "notification_type", "module", "priority", "status", "related_model", "related_object_id", "action_url", "read_at", "sent_at", "expires_at", "creado_en", "actualizado_en"]


class NotificationDetailSerializer(NotificationListSerializer):
    class Meta(NotificationListSerializer.Meta):
        fields = NotificationListSerializer.Meta.fields + ["metadata"]


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = ["id", "user", "receive_appointment_reminders", "receive_billing_alerts", "receive_inventory_alerts", "receive_purchase_alerts", "receive_audit_alerts", "receive_system_notifications", "email_enabled", "sms_enabled", "whatsapp_enabled", "push_enabled", "creado_en", "actualizado_en"]
        read_only_fields = ["id", "user", "creado_en", "actualizado_en"]

    def validate(self, attrs):
        role = get_role_name(self.context["request"].user)
        if role == "paciente":
            for field in ["receive_inventory_alerts", "receive_purchase_alerts", "receive_audit_alerts"]:
                if attrs.get(field):
                    raise serializers.ValidationError({field: "Pacientes no pueden activar alertas administrativas."})
        return attrs


class NotificationStatsSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    unread = serializers.IntegerField()
    read = serializers.IntegerField()
    archived = serializers.IntegerField()
    urgent = serializers.IntegerField()
    by_module = serializers.ListField()
    by_type = serializers.ListField()


class NotificationFilterSerializer(serializers.Serializer):
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)

    def validate(self, attrs):
        if attrs.get("date_from") and attrs.get("date_to") and attrs["date_from"] > attrs["date_to"]:
            raise serializers.ValidationError("date_from no puede ser mayor que date_to.")
        return attrs

