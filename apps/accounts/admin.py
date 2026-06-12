from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from apps.accounts.models import Role, User


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("nombre", "activo", "creado_en")
    search_fields = ("nombre",)
    list_filter = ("activo",)


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    model = User
    list_display = ("email", "nombre_completo", "role", "clinica", "is_active", "is_staff")
    list_filter = ("is_active", "is_staff", "is_superuser", "role")
    search_fields = ("email", "nombre_completo")
    ordering = ("email",)
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Información personal", {"fields": ("nombre_completo", "telefono", "avatar_url", "clinica", "role")}),
        ("Permisos", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Fechas", {"fields": ("ultimo_acceso", "last_login", "date_joined", "creado_en", "actualizado_en")}),
    )
    readonly_fields = ("creado_en", "actualizado_en", "last_login")
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "nombre_completo", "role", "clinica", "password1", "password2"),
            },
        ),
    )

