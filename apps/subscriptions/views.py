from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import get_role_name
from apps.audit.models import AuditLog
from apps.audit.services import get_object_audit_data, log_audit_event
from apps.clinics.models import Clinic
from apps.subscriptions.models import ClinicSubscription, SubscriptionPlan
from apps.subscriptions.serializers import ChangePlanSerializer, ClinicSubscriptionSerializer, ClinicSubscriptionUpdateSerializer, PlanUsageSerializer, ReasonSerializer, RenewalSerializer, SubscriptionPlanSerializer, TrialExtensionSerializer
from apps.subscriptions.services import get_clinic_subscription, get_features, get_plan_usage


def is_superadmin(user):
    return bool(user and user.is_authenticated and (user.is_superuser or get_role_name(user) == "superadmin"))


def is_admin(user):
    return get_role_name(user) == "admin"


class SubscriptionPlanViewSet(viewsets.ModelViewSet):
    queryset = SubscriptionPlan.objects.all()
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if is_superadmin(self.request.user):
            return self.queryset
        return self.queryset.filter(active=True)

    def create(self, request, *args, **kwargs):
        if not is_superadmin(request.user):
            return Response({"detail": "Solo superadmin puede crear planes."}, status=status.HTTP_403_FORBIDDEN)
        response = super().create(request, *args, **kwargs)
        if response.status_code == status.HTTP_201_CREATED:
            log_audit_event(request=request, action=AuditLog.Action.CREATE, module=AuditLog.Module.SUBSCRIPTIONS, model_name="SubscriptionPlan", object_id=response.data.get("id"), object_repr=response.data.get("name", ""), description="Plan SaaS creado.", new_values=response.data)
        return response

    def update(self, request, *args, **kwargs):
        if not is_superadmin(request.user):
            return Response({"detail": "Solo superadmin puede editar planes."}, status=status.HTTP_403_FORBIDDEN)
        plan = self.get_object()
        old_values = get_object_audit_data(plan)
        response = super().update(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            log_audit_event(request=request, action=AuditLog.Action.UPDATE, module=AuditLog.Module.SUBSCRIPTIONS, model_name="SubscriptionPlan", object_id=plan.id, object_repr=plan.name, description="Plan SaaS actualizado.", old_values=old_values, new_values=response.data)
        return response

    def destroy(self, request, *args, **kwargs):
        if not is_superadmin(request.user):
            return Response({"detail": "Solo superadmin puede desactivar planes."}, status=status.HTTP_403_FORBIDDEN)
        plan = self.get_object()
        plan.active = False
        plan.save(update_fields=["active", "actualizado_en"])
        log_audit_event(request=request, action=AuditLog.Action.DEACTIVATE, module=AuditLog.Module.SUBSCRIPTIONS, model_name="SubscriptionPlan", object_id=plan.id, object_repr=plan.name, description="Plan SaaS archivado sin eliminar suscripciones.", new_values={"active": False})
        return Response(status=status.HTTP_204_NO_CONTENT)


class MySubscriptionView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ClinicSubscriptionSerializer

    def get(self, request):
        if not is_admin(request.user):
            return Response({"detail": "Solo administradores de clinica pueden ver esta suscripcion."}, status=status.HTTP_403_FORBIDDEN)
        subscription = get_clinic_subscription(request.user.clinica)
        return Response(ClinicSubscriptionSerializer(subscription).data)


class SubscriptionFeaturesView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = SubscriptionPlanSerializer

    def get(self, request):
        clinic = getattr(request.user, "clinica", None)
        if not clinic:
            return Response({})
        return Response(get_features(clinic))


class MyPlanUsageView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PlanUsageSerializer

    def get(self, request):
        clinic = getattr(request.user, "clinica", None)
        if not clinic:
            return Response({"detail": "Tu usuario no tiene clinica asignada."}, status=status.HTTP_400_BAD_REQUEST)
        return Response(PlanUsageSerializer(get_plan_usage(clinic)).data)


class ClinicSubscriptionsView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ClinicSubscriptionSerializer

    def get(self, request):
        if not is_superadmin(request.user):
            return Response({"detail": "Solo superadmin puede ver suscripciones de clinicas."}, status=status.HTTP_403_FORBIDDEN)
        for clinic in Clinic.objects.all():
            get_clinic_subscription(clinic)
        qs = ClinicSubscription.objects.select_related("clinic", "plan")
        if request.query_params.get("status"):
            qs = qs.filter(status=request.query_params["status"])
        if request.query_params.get("plan"):
            qs = qs.filter(plan_id=request.query_params["plan"])
        return Response(ClinicSubscriptionSerializer(qs, many=True).data)


class ClinicSubscriptionDetailView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ClinicSubscriptionSerializer

    def get_subscription(self, clinic_id):
        clinic = Clinic.objects.filter(id=clinic_id).first()
        return get_clinic_subscription(clinic) if clinic else None

    def get(self, request, clinic_id):
        if not is_superadmin(request.user):
            return Response({"detail": "Solo superadmin puede ver esta suscripcion."}, status=status.HTTP_403_FORBIDDEN)
        subscription = self.get_subscription(clinic_id)
        if not subscription:
            return Response({"detail": "Clinica no encontrada."}, status=status.HTTP_404_NOT_FOUND)
        return Response(ClinicSubscriptionSerializer(subscription).data)

    def patch(self, request, clinic_id):
        if not is_superadmin(request.user):
            return Response({"detail": "Solo superadmin puede editar esta suscripcion."}, status=status.HTTP_403_FORBIDDEN)
        subscription = self.get_subscription(clinic_id)
        if not subscription:
            return Response({"detail": "Clinica no encontrada."}, status=status.HTTP_404_NOT_FOUND)
        reason = str(request.data.get("reason") or "").strip()
        if len(reason) < 5:
            return Response({"reason": "El motivo es obligatorio y debe ser claro."}, status=status.HTTP_400_BAD_REQUEST)
        payload = request.data.copy()
        payload.pop("reason", None)
        old_values = get_object_audit_data(subscription)
        serializer = ClinicSubscriptionUpdateSerializer(subscription, data=payload, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_audit_event(request=request, clinic=subscription.clinic, action=AuditLog.Action.UPDATE, module=AuditLog.Module.SUBSCRIPTIONS, model_name="ClinicSubscription", object_id=subscription.id, object_repr=str(subscription), description="Suscripción actualizada.", old_values=old_values, new_values=serializer.data, metadata={"reason": reason})
        return Response(ClinicSubscriptionSerializer(subscription).data)


class ClinicSubscriptionActionView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ClinicSubscriptionSerializer

    def get_subscription(self, clinic_id):
        clinic = Clinic.objects.filter(id=clinic_id).first()
        return get_clinic_subscription(clinic) if clinic else None

    def patch(self, request, clinic_id, action_name):
        if not is_superadmin(request.user):
            return Response({"detail": "Solo superadmin puede cambiar suscripciones."}, status=status.HTTP_403_FORBIDDEN)
        subscription = self.get_subscription(clinic_id)
        if not subscription:
            return Response({"detail": "Clinica no encontrada."}, status=status.HTTP_404_NOT_FOUND)
        serializer_class = {
            "change-plan": ChangePlanSerializer,
            "suspend": ReasonSerializer,
            "reactivate": ReasonSerializer,
            "cancel": ReasonSerializer,
            "extend-trial": TrialExtensionSerializer,
            "renew": RenewalSerializer,
        }.get(action_name)
        if not serializer_class:
            return Response({"detail": "Acción no soportada."}, status=status.HTTP_404_NOT_FOUND)
        serializer = serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            subscription = ClinicSubscription.objects.select_for_update().select_related("clinic", "plan").get(pk=subscription.pk)
            old_values = get_object_audit_data(subscription)
            values = serializer.validated_data
            if action_name == "change-plan":
                subscription.plan = values["plan"]
                subscription.billing_cycle = values["billing_cycle"]
                subscription.end_date = values.get("end_date")
                subscription.status = ClinicSubscription.Status.ACTIVE
                subscription.active = True
            elif action_name == "suspend":
                subscription.status = ClinicSubscription.Status.SUSPENDED
                subscription.suspension_reason = values["reason"]
            elif action_name == "reactivate":
                subscription.status = ClinicSubscription.Status.ACTIVE
                subscription.suspension_reason = ""
                subscription.cancelled_at = None
                subscription.active = True
            elif action_name == "cancel":
                subscription.status = ClinicSubscription.Status.CANCELLED
                subscription.suspension_reason = values["reason"]
                subscription.cancelled_at = timezone.now()
                subscription.active = False
            elif action_name == "extend-trial":
                base_date = subscription.trial_end_date or subscription.end_date or timezone.localdate()
                subscription.trial_end_date = base_date + timezone.timedelta(days=values["days"])
                subscription.end_date = subscription.trial_end_date
                subscription.status = ClinicSubscription.Status.TRIAL
                subscription.active = True
            elif action_name == "renew":
                if values["end_date"] <= timezone.localdate():
                    return Response({"end_date": "La nueva fecha debe ser futura."}, status=status.HTTP_400_BAD_REQUEST)
                subscription.end_date = values["end_date"]
                subscription.status = ClinicSubscription.Status.ACTIVE
                subscription.active = True
                subscription.cancelled_at = None
            subscription.save()
            log_audit_event(
                request=request,
                clinic=subscription.clinic,
                action=AuditLog.Action.UPDATE,
                module=AuditLog.Module.SUBSCRIPTIONS,
                model_name="ClinicSubscription",
                object_id=subscription.id,
                object_repr=str(subscription),
                description=f"Acción de suscripción: {action_name}.",
                old_values=old_values,
                new_values=get_object_audit_data(subscription),
                metadata={"reason": values["reason"], "action": action_name},
            )
        return Response(ClinicSubscriptionSerializer(subscription).data)


class ClinicPlanUsageView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PlanUsageSerializer

    def get(self, request, clinic_id):
        if not is_superadmin(request.user):
            return Response({"detail": "Solo superadmin puede ver uso de otras clinicas."}, status=status.HTTP_403_FORBIDDEN)
        clinic = Clinic.objects.filter(id=clinic_id).first()
        if not clinic:
            return Response({"detail": "Clinica no encontrada."}, status=status.HTTP_404_NOT_FOUND)
        return Response(PlanUsageSerializer(get_plan_usage(clinic)).data)
