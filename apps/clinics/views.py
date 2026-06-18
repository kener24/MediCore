from django.db.models import Q
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.permissions import IsSuperAdmin, get_role_name
from apps.audit.models import AuditLog
from apps.audit.services import get_object_audit_data, log_audit_event
from apps.clinics.models import Clinic
from apps.clinics.serializers import ClinicSerializer


class ClinicViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = ClinicSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Clinic.objects.all()

        if user.is_superuser or get_role_name(user) == "superadmin":
            is_active = self.request.query_params.get("is_active") or self.request.query_params.get("activo")
            search = self.request.query_params.get("search")
            if is_active is not None:
                queryset = queryset.filter(activo=is_active.lower() in ["1", "true", "yes", "si"])
            if search:
                queryset = queryset.filter(
                    Q(nombre__icontains=search)
                    | Q(correo__icontains=search)
                    | Q(rtn__icontains=search)
                )
            return queryset

        if user.clinica_id:
            return queryset.filter(id=user.clinica_id)
        return queryset.none()

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "activate", "deactivate"]:
            return [IsSuperAdmin()]
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        if response.status_code == 201:
            clinic = Clinic.objects.filter(id=response.data.get("id")).first()
            log_audit_event(request=request, clinic=clinic, action=AuditLog.Action.CREATE, module=AuditLog.Module.CLINICS, model_name="Clinic", object_id=response.data.get("id"), object_repr=response.data.get("nombre", ""), description="Clinica creada.", new_values=request.data)
        return response

    def update(self, request, *args, **kwargs):
        clinic = self.get_object()
        old_values = get_object_audit_data(clinic)
        response = super().update(request, *args, **kwargs)
        if response.status_code == 200:
            log_audit_event(request=request, clinic=clinic, action=AuditLog.Action.SETTINGS_CHANGE, module=AuditLog.Module.CLINICS, model_name="Clinic", object_id=clinic.id, object_repr=clinic.nombre, description="Clinica actualizada.", old_values=old_values, new_values=request.data)
        return response

    @action(detail=True, methods=["patch"])
    def activate(self, request, pk=None):
        clinic = self.get_object()
        clinic.activo = True
        clinic.save(update_fields=["activo"])
        log_audit_event(request=request, clinic=clinic, action=AuditLog.Action.ACTIVATE, module=AuditLog.Module.CLINICS, model_name="Clinic", object_id=clinic.id, object_repr=clinic.nombre, description="Clinica activada.", new_values={"activo": True})
        return Response(self.get_serializer(clinic).data)

    @action(detail=True, methods=["patch"])
    def deactivate(self, request, pk=None):
        clinic = self.get_object()
        clinic.activo = False
        clinic.save(update_fields=["activo"])
        log_audit_event(request=request, clinic=clinic, action=AuditLog.Action.DEACTIVATE, module=AuditLog.Module.CLINICS, model_name="Clinic", object_id=clinic.id, object_repr=clinic.nombre, description="Clinica desactivada.", new_values={"activo": False})
        return Response(self.get_serializer(clinic).data)
