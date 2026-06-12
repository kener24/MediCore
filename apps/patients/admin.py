from django.contrib import admin

from apps.patients.models import Patient


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ("codigo_paciente", "nombre_completo", "clinic", "identidad", "telefono", "activo")
    search_fields = ("codigo_paciente", "nombre_completo", "identidad", "telefono", "correo")
    list_filter = ("clinic", "genero", "tipo_sangre", "activo")

