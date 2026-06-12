from django.contrib import admin

from apps.clinics.models import Clinic


@admin.register(Clinic)
class ClinicAdmin(admin.ModelAdmin):
    list_display = ("nombre", "correo", "telefono", "activo")
    search_fields = ("nombre", "correo", "rtn")
    list_filter = ("activo",)

