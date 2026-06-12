from django.contrib import admin

from apps.subscriptions.models import ClinicSubscription, SubscriptionPlan


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "price_monthly", "max_users", "max_patients", "active"]
    search_fields = ["name", "code"]


@admin.register(ClinicSubscription)
class ClinicSubscriptionAdmin(admin.ModelAdmin):
    list_display = ["clinic", "plan", "status", "billing_cycle", "end_date", "active"]
    list_filter = ["status", "billing_cycle", "plan"]

