from rest_framework import permissions


def get_role_name(user):
    return getattr(getattr(user, "role", None), "nombre", None)


def has_active_clinic_admin_identity(user):
    return bool(
        user
        and user.is_authenticated
        and user.is_active
        and get_role_name(user) == "admin"
        and user.clinica_id
        and getattr(user.clinica, "activo", False)
    )


class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_superuser or get_role_name(request.user) == "superadmin")
        )


class IsClinicAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated or not user.is_active:
            return False
        if user.is_superuser or get_role_name(user) == "superadmin":
            return True
        return has_active_clinic_admin_identity(user)


class IsClinicAdminOrSuperAdmin(IsClinicAdmin):
    pass


class CanManageClinicUsers(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated or not user.is_active:
            return False
        if user.is_superuser or get_role_name(user) == "superadmin":
            return True
        return has_active_clinic_admin_identity(user)

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser or get_role_name(user) == "superadmin":
            return True
        return get_role_name(user) == "admin" and obj.clinica_id == user.clinica_id


class IsSameClinic(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser or get_role_name(user) == "superadmin":
            return True
        return getattr(obj, "clinica_id", None) == user.clinica_id


class IsOwnerOrAdmin(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if obj == user:
            return True
        if user.is_superuser or get_role_name(user) == "superadmin":
            return True
        return get_role_name(user) == "admin" and getattr(obj, "clinica_id", None) == user.clinica_id
