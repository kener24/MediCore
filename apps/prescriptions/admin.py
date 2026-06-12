from django.contrib import admin

from apps.prescriptions.models import Diagnosis, MedicalOrder, Prescription, PrescriptionItem


@admin.register(Diagnosis)
class DiagnosisAdmin(admin.ModelAdmin):
    list_display = ("name", "patient", "doctor", "diagnosis_type", "is_primary", "activo")
    search_fields = ("name", "code", "patient__nombre_completo")
    list_filter = ("clinic", "diagnosis_type", "is_primary", "activo")


class PrescriptionItemInline(admin.TabularInline):
    model = PrescriptionItem
    extra = 0


@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = ("prescription_number", "patient", "doctor", "issue_date", "status")
    search_fields = ("prescription_number", "patient__nombre_completo", "items__medication_name")
    list_filter = ("clinic", "status", "issue_date")
    inlines = [PrescriptionItemInline]


@admin.register(MedicalOrder)
class MedicalOrderAdmin(admin.ModelAdmin):
    list_display = ("order_number", "title", "patient", "doctor", "order_type", "priority", "status")
    search_fields = ("order_number", "title", "patient__nombre_completo")
    list_filter = ("clinic", "order_type", "priority", "status")
