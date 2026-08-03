from rest_framework import serializers

from apps.clinics.models import Clinic
from apps.core.validators import validate_digits_identifier, validate_phone


class ClinicSerializer(serializers.ModelSerializer):
    plan = serializers.SerializerMethodField()
    subscription_status = serializers.SerializerMethodField()
    subscription_end_date = serializers.SerializerMethodField()
    users_count = serializers.IntegerField(read_only=True, default=0)
    doctors_count = serializers.IntegerField(read_only=True, default=0)
    patients_count = serializers.IntegerField(read_only=True, default=0)

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
            "plan",
            "subscription_status",
            "subscription_end_date",
            "users_count",
            "doctors_count",
            "patients_count",
            "creado_en",
            "actualizado_en",
        ]
        read_only_fields = ["id", "creado_en", "actualizado_en"]

    def validate_rtn(self, value):
        return validate_digits_identifier(value, "El RTN", min_length=8, max_length=20)

    def validate_telefono(self, value):
        return validate_phone(value)

    def get_plan(self, obj):
        subscription = getattr(obj, "subscription", None)
        return subscription.plan.name if subscription else None

    def get_subscription_status(self, obj):
        subscription = getattr(obj, "subscription", None)
        return subscription.status if subscription else None

    def get_subscription_end_date(self, obj):
        subscription = getattr(obj, "subscription", None)
        return subscription.end_date if subscription else None
