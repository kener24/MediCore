from django.contrib import admin

from apps.medical_records.models import ClinicalConsultation, MedicalRecord, VitalSigns


@admin.register(MedicalRecord)
class MedicalRecordAdmin(admin.ModelAdmin):
    list_display = ("record_number", "patient", "clinic", "activo", "creado_en")
    search_fields = ("record_number", "patient__nombre_completo", "patient__identidad")
    list_filter = ("clinic", "activo")


@admin.register(ClinicalConsultation)
class ClinicalConsultationAdmin(admin.ModelAdmin):
    list_display = ("patient", "doctor", "consultation_date", "status", "clinic")
    search_fields = ("patient__nombre_completo", "doctor__user__nombre_completo", "chief_complaint")
    list_filter = ("clinic", "status", "consultation_date")


@admin.register(VitalSigns)
class VitalSignsAdmin(admin.ModelAdmin):
    list_display = ("consultation", "temperature", "heart_rate", "weight", "height", "bmi")
