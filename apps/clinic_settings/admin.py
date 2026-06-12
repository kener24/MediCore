from django.contrib import admin

from apps.clinic_settings.models import ClinicSettings


@admin.register(ClinicSettings)
class ClinicSettingsAdmin(admin.ModelAdmin):
    list_display = ["clinic", "currency", "timezone", "allow_patient_portal", "allow_online_appointments", "active"]
    search_fields = ["clinic__nombre", "fiscal_name", "fiscal_rtn"]

