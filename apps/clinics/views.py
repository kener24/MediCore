from django.db import IntegrityError, transaction
from django.db.models import Count, Q
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status

from apps.accounts.permissions import IsSuperAdmin, get_role_name
from apps.accounts.models import Role, User
from apps.accounts.serializers import UserCreateSerializer
from apps.accounts.superadmin_services import clinic_creation_fingerprint
from apps.audit.models import AuditLog
from apps.audit.services import get_object_audit_data, log_audit_event
from apps.clinic_settings.models import get_or_create_clinic_settings, get_or_create_workflow_settings
from apps.clinics.models import Clinic
from apps.clinics.serializers import ClinicSerializer
from apps.security.services import revoke_all_user_sessions
from apps.subscriptions.models import ClinicSubscription, SubscriptionPlan
from apps.subscriptions.services import get_clinic_subscription


def action_reason(request):
    reason = str(request.data.get("reason") or request.data.get("motivo") or "").strip()
    if len(reason) < 5:
        return ""
    return reason


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
        queryset = Clinic.objects.select_related("subscription__plan").annotate(
            users_count=Count("usuarios", distinct=True),
            doctors_count=Count("doctor_profiles", distinct=True),
            patients_count=Count("patients", distinct=True),
        )

        if user.is_superuser or get_role_name(user) == "superadmin":
            is_active = self.request.query_params.get("is_active") or self.request.query_params.get("activo")
            search = self.request.query_params.get("search")
            plan = self.request.query_params.get("plan")
            subscription = self.request.query_params.get("subscription")
            if is_active is not None:
                queryset = queryset.filter(activo=is_active.lower() in ["1", "true", "yes", "si"])
            if plan:
                queryset = queryset.filter(Q(subscription__plan_id=plan) | Q(subscription__plan__code=plan))
            if subscription:
                queryset = queryset.filter(subscription__status=subscription)
            if search:
                queryset = queryset.filter(
                    Q(nombre__icontains=search)
                    | Q(correo__icontains=search)
                    | Q(rtn__icontains=search)
                    | Q(direccion__icontains=search)
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
        idempotency_key = str(request.headers.get("Idempotency-Key") or "").strip()
        if len(idempotency_key) > 100:
            return Response({"detail": "La clave de idempotencia no puede superar 100 caracteres."}, status=status.HTTP_400_BAD_REQUEST)

        if idempotency_key:
            replay = Clinic.objects.filter(creation_idempotency_key=idempotency_key).first()
            if replay:
                response = Response(self.get_serializer(replay).data, status=status.HTTP_200_OK)
                response["X-Idempotent-Replay"] = "true"
                return response

        payload = request.data.copy()
        initial_admin = payload.pop("initial_admin", None)
        plan_id = payload.pop("plan", None)
        fingerprint = clinic_creation_fingerprint(payload)
        duplicate = Clinic.objects.filter(creation_fingerprint=fingerprint).first()
        if not duplicate:
            duplicate_query = Q(nombre__iexact=str(payload.get("nombre") or "").strip())
            if payload.get("rtn"):
                duplicate_query |= Q(rtn=str(payload.get("rtn")).strip())
            if payload.get("correo"):
                duplicate_query |= Q(correo__iexact=str(payload.get("correo")).strip())
            duplicate = Clinic.objects.filter(duplicate_query).first()
        if duplicate:
            return Response({"detail": "La clínica ya fue creada."}, status=status.HTTP_409_CONFLICT)

        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                clinic = serializer.save(
                    creation_idempotency_key=idempotency_key or None,
                    creation_fingerprint=fingerprint,
                )
                get_or_create_clinic_settings(clinic)
                get_or_create_workflow_settings(clinic)
                subscription = get_clinic_subscription(clinic)
                if plan_id:
                    plan = SubscriptionPlan.objects.filter(id=plan_id, active=True).first()
                    if not plan:
                        raise ValueError("El plan seleccionado no está disponible.")
                    subscription.plan = plan
                    subscription.save(update_fields=["plan", "actualizado_en"])

                created_admin = None
                if initial_admin:
                    admin_role = Role.objects.filter(nombre="admin", activo=True).first()
                    if not admin_role:
                        raise ValueError("El rol de administrador de clínica no está configurado.")
                    admin_payload = dict(initial_admin)
                    admin_payload.update({"clinica": clinic.id, "role": admin_role.id})
                    admin_serializer = UserCreateSerializer(data=admin_payload, context={"request": request})
                    admin_serializer.is_valid(raise_exception=True)
                    created_admin = admin_serializer.save()

                log_audit_event(
                    request=request,
                    clinic=clinic,
                    action=AuditLog.Action.CREATE,
                    module=AuditLog.Module.CLINICS,
                    model_name="Clinic",
                    object_id=clinic.id,
                    object_repr=clinic.nombre,
                    description="Clínica creada con configuración inicial.",
                    new_values={
                        "nombre": clinic.nombre,
                        "activo": clinic.activo,
                        "plan": subscription.plan.code,
                        "initial_admin": getattr(created_admin, "email", None),
                    },
                    metadata={"idempotency_key_present": bool(idempotency_key)},
                )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except IntegrityError:
            if idempotency_key:
                replay = Clinic.objects.filter(creation_idempotency_key=idempotency_key).first()
                if replay:
                    response = Response(self.get_serializer(replay).data, status=status.HTTP_200_OK)
                    response["X-Idempotent-Replay"] = "true"
                    return response
            return Response({"detail": "La clínica ya fue creada."}, status=status.HTTP_409_CONFLICT)

        output = self.get_serializer(self.get_queryset().get(pk=clinic.pk)).data
        return Response(output, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        clinic = self.get_object()
        old_values = get_object_audit_data(clinic)
        response = super().update(request, *args, **kwargs)
        if response.status_code == 200:
            log_audit_event(request=request, clinic=clinic, action=AuditLog.Action.SETTINGS_CHANGE, module=AuditLog.Module.CLINICS, model_name="Clinic", object_id=clinic.id, object_repr=clinic.nombre, description="Clinica actualizada.", old_values=old_values, new_values=request.data)
        return response

    @action(detail=True, methods=["patch", "post"])
    def activate(self, request, pk=None):
        reason = action_reason(request)
        if not reason:
            return Response({"reason": "El motivo es obligatorio y debe ser claro."}, status=400)
        with transaction.atomic():
            clinic = Clinic.objects.select_for_update().get(pk=self.get_object().pk)
            subscription = get_clinic_subscription(clinic)
            if not subscription.is_active_subscription:
                return Response({"detail": "La suscripción no está activa."}, status=status.HTTP_409_CONFLICT)
            old_values = {"activo": clinic.activo}
            clinic.activo = True
            clinic.save(update_fields=["activo", "actualizado_en"])
            log_audit_event(request=request, clinic=clinic, action=AuditLog.Action.ACTIVATE, module=AuditLog.Module.CLINICS, model_name="Clinic", object_id=clinic.id, object_repr=clinic.nombre, description="Clínica activada.", old_values=old_values, new_values={"activo": True}, metadata={"reason": reason})
        return Response(self.get_serializer(clinic).data)

    @action(detail=True, methods=["patch", "post"], url_path="deactivate")
    def deactivate(self, request, pk=None):
        reason = action_reason(request)
        if not reason:
            return Response({"reason": "El motivo es obligatorio y debe ser claro."}, status=400)
        with transaction.atomic():
            clinic = Clinic.objects.select_for_update().get(pk=self.get_object().pk)
            old_values = {"activo": clinic.activo}
            clinic.activo = False
            clinic.save(update_fields=["activo", "actualizado_en"])
            users = list(User.objects.select_for_update().filter(clinica=clinic, is_active=True))
            for user in users:
                revoke_all_user_sessions(user, revoked_by=request.user)
            log_audit_event(request=request, clinic=clinic, action=AuditLog.Action.DEACTIVATE, module=AuditLog.Module.CLINICS, model_name="Clinic", object_id=clinic.id, object_repr=clinic.nombre, description="Clínica suspendida y sesiones revocadas.", old_values=old_values, new_values={"activo": False, "sessions_revoked_for_users": len(users)}, metadata={"reason": reason})
        return Response(self.get_serializer(clinic).data)
