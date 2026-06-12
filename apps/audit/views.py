from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import get_role_name
from apps.audit.models import AuditLog
from apps.audit.serializers import AuditFilterSerializer, AuditLogDetailSerializer, AuditLogListSerializer, AuditLogStatsSerializer


def can_view_audit(user):
    return bool(user and user.is_authenticated and (user.is_superuser or get_role_name(user) in ["superadmin", "admin"]))


def is_super(user):
    return bool(user.is_superuser or get_role_name(user) == "superadmin")


def scoped_logs(request):
    queryset = AuditLog.objects.select_related("clinic", "user")
    if is_super(request.user):
        clinic = request.query_params.get("clinic")
        if clinic:
            queryset = queryset.filter(clinic_id=clinic)
    elif get_role_name(request.user) == "admin" and request.user.clinica_id:
        queryset = queryset.filter(clinic_id=request.user.clinica_id)
    else:
        queryset = queryset.none()
    return queryset


def apply_filters(request, queryset):
    filters = AuditFilterSerializer(data=request.query_params)
    filters.is_valid(raise_exception=True)
    params = request.query_params
    for param in ["user", "action", "module", "severity", "model_name", "object_id"]:
        if params.get(param):
            field = f"{param}_id" if param == "user" else param
            queryset = queryset.filter(**{field: params[param]})
    if filters.validated_data.get("date_from"):
        queryset = queryset.filter(created_at__date__gte=filters.validated_data["date_from"])
    if filters.validated_data.get("date_to"):
        queryset = queryset.filter(created_at__date__lte=filters.validated_data["date_to"])
    if params.get("search"):
        s = params["search"]
        queryset = queryset.filter(Q(description__icontains=s) | Q(object_repr__icontains=s) | Q(request_path__icontains=s))
    return queryset


class AuditPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 200


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = AuditLog.objects.select_related("clinic", "user")
    pagination_class = AuditPagination

    def get_serializer_class(self):
        return AuditLogDetailSerializer if self.action == "retrieve" else AuditLogListSerializer

    def get_queryset(self):
        if not can_view_audit(self.request.user):
            return AuditLog.objects.none()
        return apply_filters(self.request, scoped_logs(self.request))

    def list(self, request, *args, **kwargs):
        if not can_view_audit(request.user):
            return Response({"detail": "No tienes permiso para ver la bitacora."}, status=status.HTTP_403_FORBIDDEN)
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        if not can_view_audit(request.user):
            return Response({"detail": "No tienes permiso para ver la bitacora."}, status=status.HTTP_403_FORBIDDEN)
        return super().retrieve(request, *args, **kwargs)

    @action(detail=False, methods=["get"], url_path="my-activity")
    def my_activity(self, request):
        queryset = AuditLog.objects.select_related("clinic", "user").filter(user=request.user)
        queryset = apply_filters(request, queryset)
        page = self.paginate_queryset(queryset)
        serializer = AuditLogListSerializer(page if page is not None else queryset, many=True)
        return self.get_paginated_response(serializer.data) if page is not None else Response(serializer.data)


class AuditStatsViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        if not can_view_audit(request.user):
            return Response({"detail": "No tienes permiso para ver estadisticas de auditoria."}, status=status.HTTP_403_FORBIDDEN)
        queryset = apply_filters(request, scoped_logs(request))
        today = timezone.localdate()
        data = {
            "total_logs": queryset.count(),
            "logs_today": queryset.filter(created_at__date=today).count(),
            "warnings": queryset.filter(severity=AuditLog.Severity.WARNING).count(),
            "errors": queryset.filter(severity=AuditLog.Severity.ERROR).count(),
            "critical": queryset.filter(severity=AuditLog.Severity.CRITICAL).count(),
            "login_success": queryset.filter(action=AuditLog.Action.LOGIN_SUCCESS).count(),
            "login_failed": queryset.filter(action=AuditLog.Action.LOGIN_FAILED).count(),
            "top_actions": list(queryset.values("action").annotate(count=Count("id")).order_by("-count")[:8]),
            "top_modules": list(queryset.values("module").annotate(count=Count("id")).order_by("-count")[:8]),
        }
        return Response(AuditLogStatsSerializer(data).data)
