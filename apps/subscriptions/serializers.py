from rest_framework import serializers

from apps.subscriptions.models import ClinicSubscription, SubscriptionPlan


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = "__all__"
        read_only_fields = ["id", "creado_en", "actualizado_en"]


class ClinicSubscriptionSerializer(serializers.ModelSerializer):
    clinic_nombre = serializers.CharField(source="clinic.nombre", read_only=True)
    plan_nombre = serializers.CharField(source="plan.name", read_only=True)
    plan_code = serializers.CharField(source="plan.code", read_only=True)

    class Meta:
        model = ClinicSubscription
        fields = "__all__"
        read_only_fields = ["id", "clinic", "clinic_nombre", "plan_nombre", "plan_code", "creado_en", "actualizado_en"]


class ClinicSubscriptionUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClinicSubscription
        fields = ["plan", "status", "billing_cycle", "start_date", "end_date", "trial_end_date", "next_payment_date", "suspension_reason", "notes", "active"]


class ChangePlanSerializer(serializers.Serializer):
    plan = serializers.PrimaryKeyRelatedField(queryset=SubscriptionPlan.objects.filter(active=True))
    billing_cycle = serializers.ChoiceField(choices=ClinicSubscription.BillingCycle.choices, default=ClinicSubscription.BillingCycle.MONTHLY)
    end_date = serializers.DateField(required=False, allow_null=True)


class ReasonSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True)


class PlanUsageSerializer(serializers.Serializer):
    plan = serializers.CharField()
    plan_code = serializers.CharField()
    status = serializers.CharField()
    max_users = serializers.IntegerField()
    users_count = serializers.IntegerField()
    max_doctors = serializers.IntegerField()
    doctors_count = serializers.IntegerField()
    max_patients = serializers.IntegerField()
    patients_count = serializers.IntegerField()
    max_appointments_per_month = serializers.IntegerField()
    appointments_this_month = serializers.IntegerField()
    max_storage_mb = serializers.IntegerField()
    storage_used_mb = serializers.IntegerField()

