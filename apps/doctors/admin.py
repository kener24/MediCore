from django.contrib import admin

from apps.doctors.models import DoctorProfile, DoctorSchedule, MedicalSpecialty


@admin.register(MedicalSpecialty)
class MedicalSpecialtyAdmin(admin.ModelAdmin):
    list_display = ("nombre", "activo")
    search_fields = ("nombre",)
    list_filter = ("activo",)


@admin.register(DoctorProfile)
class DoctorProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "clinic", "specialty", "numero_colegiacion", "activo")
    search_fields = ("user__nombre_completo", "user__email", "numero_colegiacion")
    list_filter = ("clinic", "specialty", "activo")


@admin.register(DoctorSchedule)
class DoctorScheduleAdmin(admin.ModelAdmin):
    list_display = ("doctor", "dia_semana", "hora_inicio", "hora_fin", "activo")
    list_filter = ("dia_semana", "activo")

