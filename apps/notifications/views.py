from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import get_role_name
from apps.notifications.generators import generate_appointment_reminders, generate_billing_alerts, generate_inventory_alerts
from apps.notifications.models import Notification, NotificationPreference
from apps.notifications.serializers import NotificationDetailSerializer, NotificationFilterSerializer, NotificationListSerializer, NotificationPreferenceSerializer, NotificationStatsSerializer


class NotificationPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100


def can_generate(user):
    return bool(user.is_superuser or get_role_name(user) in ["superadmin", "admin"])


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    pagination_class = NotificationPagination
    queryset = Notification.objects.select_related("clinic", "recipient")

    def get_serializer_class(self):
        return NotificationDetailSerializer if self.action == "retrieve" else NotificationListSerializer

    def get_queryset(self):
        qs = self.queryset.filter(recipient=self.request.user)
        p = self.request.query_params
        filters = NotificationFilterSerializer(data=p)
        filters.is_valid(raise_exception=True)
        for param in ["status", "notification_type", "module", "priority"]:
            if p.get(param):
                qs = qs.filter(**{param: p[param]})
        if filters.validated_data.get("date_from"):
            qs = qs.filter(creado_en__date__gte=filters.validated_data["date_from"])
        if filters.validated_data.get("date_to"):
            qs = qs.filter(creado_en__date__lte=filters.validated_data["date_to"])
        if p.get("search"):
            qs = qs.filter(Q(title__icontains=p["search"]) | Q(message__icontains=p["search"]))
        return qs

    @action(detail=True, methods=["patch"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.status = Notification.Status.READ
        notification.read_at = timezone.now()
        notification.save(update_fields=["status", "read_at", "actualizado_en"])
        return Response(NotificationDetailSerializer(notification).data)

    @action(detail=True, methods=["patch"], url_path="mark-unread")
    def mark_unread(self, request, pk=None):
        notification = self.get_object()
        notification.status = Notification.Status.UNREAD
        notification.read_at = None
        notification.save(update_fields=["status", "read_at", "actualizado_en"])
        return Response(NotificationDetailSerializer(notification).data)

    @action(detail=True, methods=["patch"])
    def archive(self, request, pk=None):
        notification = self.get_object()
        notification.status = Notification.Status.ARCHIVED
        notification.save(update_fields=["status", "actualizado_en"])
        return Response(NotificationDetailSerializer(notification).data)

    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request):
        updated = self.get_queryset().filter(status=Notification.Status.UNREAD).update(status=Notification.Status.READ, read_at=timezone.now())
        return Response({"updated": updated})

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        return Response({"unread_count": self.get_queryset().filter(status=Notification.Status.UNREAD).count()})

    @action(detail=False, methods=["get"])
    def summary(self, request):
        qs = self.get_queryset()
        latest = qs.exclude(status=Notification.Status.ARCHIVED)[:5]
        return Response({
            "unread_count": qs.filter(status=Notification.Status.UNREAD).count(),
            "urgent_count": qs.filter(status=Notification.Status.UNREAD, priority=Notification.Priority.URGENT).count(),
            "high_priority_count": qs.filter(status=Notification.Status.UNREAD, priority=Notification.Priority.HIGH).count(),
            "latest": NotificationListSerializer(latest, many=True).data,
        })


class NotificationPreferenceView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, request):
        preferences, _ = NotificationPreference.objects.get_or_create(user=request.user)
        return preferences

    def get(self, request):
        return Response(NotificationPreferenceSerializer(self.get_object(request), context={"request": request}).data)

    def patch(self, request):
        preferences = self.get_object(request)
        serializer = NotificationPreferenceSerializer(preferences, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class NotificationStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Notification.objects.filter(recipient=request.user)
        data = {
            "total": qs.count(),
            "unread": qs.filter(status=Notification.Status.UNREAD).count(),
            "read": qs.filter(status=Notification.Status.READ).count(),
            "archived": qs.filter(status=Notification.Status.ARCHIVED).count(),
            "urgent": qs.filter(priority=Notification.Priority.URGENT).count(),
            "by_module": list(qs.values("module").annotate(count=Count("id")).order_by("-count")),
            "by_type": list(qs.values("notification_type").annotate(count=Count("id")).order_by("-count")),
        }
        return Response(NotificationStatsSerializer(data).data)


class GenerateInventoryAlertsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not can_generate(request.user):
            return Response({"detail": "No tienes permiso para generar alertas."}, status=status.HTTP_403_FORBIDDEN)
        return Response({"created": generate_inventory_alerts()})


class GenerateAppointmentRemindersView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not can_generate(request.user):
            return Response({"detail": "No tienes permiso para generar recordatorios."}, status=status.HTTP_403_FORBIDDEN)
        return Response({"created": generate_appointment_reminders(int(request.data.get("hours", 24)))})


class GenerateBillingAlertsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not can_generate(request.user):
            return Response({"detail": "No tienes permiso para generar alertas."}, status=status.HTTP_403_FORBIDDEN)
        return Response({"created": generate_billing_alerts()})
