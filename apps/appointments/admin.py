from django.contrib import admin

from apps.appointments.models import Appointment


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ("scheduled_date", "start_time", "patient", "doctor", "status", "activo")
    search_fields = ("patient__nombre_completo", "doctor__user__nombre_completo", "reason")
    list_filter = ("clinic", "status", "scheduled_date", "activo")

