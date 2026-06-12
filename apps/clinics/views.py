from django.db.models import Q
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.permissions import IsSuperAdmin, get_role_name
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

    @action(detail=True, methods=["patch"])
    def activate(self, request, pk=None):
        clinic = self.get_object()
        clinic.activo = True
        clinic.save(update_fields=["activo"])
        return Response(self.get_serializer(clinic).data)

    @action(detail=True, methods=["patch"])
    def deactivate(self, request, pk=None):
        clinic = self.get_object()
        clinic.activo = False
        clinic.save(update_fields=["activo"])
        return Response(self.get_serializer(clinic).data)
