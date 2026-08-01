from django.db import IntegrityError, transaction
from django.db.models import Count, Exists, OuterRef, Q
from django.http import Http404
from django.utils import timezone
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.accounts.models import Role, User
from apps.accounts.clinic_admin_services import build_clinic_admin_alerts, build_clinic_admin_dashboard
from apps.accounts.permissions import CanManageClinicUsers, IsClinicAdmin, IsOwnerOrAdmin, IsSuperAdmin, get_role_name
from apps.accounts.role_permissions import ROLE_PERMISSION_GROUPS
from apps.accounts.serializers import (
    CLINIC_ADMIN_MANAGED_ROLES,
    ChangePasswordSerializer,
    ClinicAdminUserCreateSerializer,
    ClinicAdminUserReadSerializer,
    ClinicAdminUserUpdateSerializer,
    MeSerializer,
    MeUpdateSerializer,
    MyClinicSerializer,
    RoleSerializer,
    UserCreateSerializer,
    UserDetailSerializer,
    UserListSerializer,
    UserUpdateSerializer,
)
from apps.clinics.models import Clinic
from apps.audit.models import AuditLog
from apps.notifications.models import Notification, PushDevice
from apps.notifications.services import create_notification
from apps.doctors.serializers import DoctorProfileCreateSerializer, DoctorProfileDetailSerializer
from apps.audit.services import get_object_audit_data, log_audit_event
from apps.security.models import UserSession
from apps.security.services import active_lock, create_password_reset_token, create_user_session, hash_token, record_login_attempt, register_failed_login, revoke_all_user_sessions, revoke_user_session


class LoginSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        email = attrs.get("email", "")
        candidate = User.objects.filter(email__iexact=email).select_related("clinica").first()
        if candidate:
            lock = active_lock(candidate)
            if lock:
                raise serializers.ValidationError({"detail": f"Cuenta bloqueada temporalmente hasta {lock.locked_until}."})
            if candidate.clinica_id and not candidate.clinica.activo:
                raise serializers.ValidationError({"detail": "La clínica asociada está inactiva. Contacta al administrador del sistema."})
        data = super().validate(attrs)
        data["user"] = MeSerializer(self.user).data
        return data


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        email = request.data.get("email", "")
        if response.status_code == status.HTTP_200_OK:
            user = User.objects.filter(email=email).select_related("clinica").first()
            record_login_attempt(email, request, True, user=user)
            session = create_user_session(user, request, refresh_token=response.data.get("refresh")) if user else None
            if session:
                response.data["session_key"] = session.session_key
            log_audit_event(request=request, user=user, clinic=getattr(user, "clinica", None), action=AuditLog.Action.LOGIN_SUCCESS, module=AuditLog.Module.AUTH, model_name="User", object_id=getattr(user, "id", None), object_repr=email, description="Inicio de sesion exitoso.", new_values={"email": email})
        return response

    def handle_exception(self, exc):
        request = self.request
        email = request.data.get("email", "") if request else ""
        user = User.objects.filter(email__iexact=email).select_related("clinica").first()
        record_login_attempt(email, request, False, user=user, failure_reason=str(exc)[:180])
        register_failed_login(user, request)
        log_audit_event(request=request, user=user, clinic=getattr(user, "clinica", None), action=AuditLog.Action.LOGIN_FAILED, module=AuditLog.Module.AUTH, object_repr=email, description="Intento fallido de login.", status=AuditLog.Status.FAILED, severity=AuditLog.Severity.WARNING, metadata={"email": email})
        return super().handle_exception(exc)


class SessionTokenRefreshView(TokenRefreshView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        refresh_token = str(request.data.get("refresh") or "")
        session_key = request.headers.get("X-Session-Key", "").strip()
        if not refresh_token or not session_key:
            return Response({"detail": "La sesión no es válida. Inicia sesión nuevamente."}, status=status.HTTP_401_UNAUTHORIZED)

        session = UserSession.objects.select_related("user", "user__clinica").filter(
            session_key=session_key,
            refresh_token_hash=hash_token(refresh_token),
            active=True,
            expires_at__gt=timezone.now(),
        ).first()
        if not session:
            return Response({"detail": "Tu sesión expiró o fue revocada. Inicia sesión nuevamente."}, status=status.HTTP_401_UNAUTHORIZED)
        if not session.user.is_active:
            revoke_user_session(session)
            return Response({"detail": "Tu usuario se encuentra inactivo."}, status=status.HTTP_401_UNAUTHORIZED)
        if session.user.clinica_id and not session.user.clinica.activo:
            revoke_user_session(session)
            return Response({"detail": "Tu clínica se encuentra inactiva."}, status=status.HTTP_401_UNAUTHORIZED)

        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            session.last_activity_at = timezone.now()
            session.save(update_fields=["last_activity_at"])
        return response


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        session = getattr(request, "medicore_session", None)
        if session is None:
            session_key = request.headers.get("X-Session-Key", "").strip()
            session = UserSession.objects.filter(user=request.user, session_key=session_key, active=True).first()
        if session:
            revoke_user_session(session, revoked_by=request.user)
        installation_id = request.headers.get("X-Installation-Id", "").strip()
        if installation_id:
            PushDevice.objects.filter(user=request.user, installation_id=installation_id, is_active=True).update(
                is_active=False,
                revoked_at=timezone.now(),
                actualizado_en=timezone.now(),
            )
        log_audit_event(
            request=request,
            action=AuditLog.Action.LOGOUT,
            module=AuditLog.Module.AUTH,
            model_name="User",
            object_id=request.user.id,
            object_repr=request.user.email,
            description="Cierre de sesión.",
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MeSerializer

    def get(self, request):
        return Response(MeSerializer(request.user).data)

    def patch(self, request):
        serializer = MeUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        log_audit_event(
            request=request,
            user=user,
            clinic=getattr(user, "clinica", None),
            action=AuditLog.Action.UPDATE,
            module=AuditLog.Module.AUTH,
            model_name="User",
            object_id=user.id,
            object_repr=user.email,
            description="Actualizacion de perfil propio.",
            new_values=serializer.validated_data,
        )
        return Response(MeSerializer(user).data)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ChangePasswordSerializer

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        current_session = request.headers.get("X-Session-Key")
        revoke_all_user_sessions(user, keep_current=current_session, revoked_by=user)
        log_audit_event(request=request, action=AuditLog.Action.PASSWORD_CHANGE, module=AuditLog.Module.AUTH, model_name="User", object_id=request.user.id, object_repr=request.user.email, description="Cambio de contrasena.")
        create_notification(
            user,
            "Contraseña actualizada",
            "Tu contraseña fue actualizada correctamente. Si no realizaste este cambio, contacta al administrador de tu clínica.",
            clinic=user.clinica,
            module=Notification.Module.AUTH,
            notification_type=Notification.Type.SUCCESS,
            priority=Notification.Priority.HIGH,
            force_email=True,
        )
        return Response({"detail": "Contraseña actualizada correctamente."})


class SuperAdminDashboardView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        role_counts = {
            item["role__nombre"]: item["total"]
            for item in User.objects.values("role__nombre").annotate(total=Count("id"))
        }
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        total_clinics = Clinic.objects.count()
        active_clinics = Clinic.objects.filter(activo=True).count()

        return Response(
            {
                "total_clinics": total_clinics,
                "active_clinics": active_clinics,
                "inactive_clinics": total_clinics - active_clinics,
                "total_users": total_users,
                "active_users": active_users,
                "inactive_users": total_users - active_users,
                "total_admins": role_counts.get("admin", 0),
                "total_medicos": role_counts.get("medico", 0),
                "total_pacientes": role_counts.get("paciente", 0),
            }
        )


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.select_related("role", "clinica")

    def get_serializer_class(self):
        if self.action == "list":
            return UserListSerializer
        if self.action == "create":
            return UserCreateSerializer
        if self.action in ["update", "partial_update"]:
            return UserUpdateSerializer
        return UserDetailSerializer

    def get_permissions(self):
        if self.action in ["list", "create"]:
            return [IsClinicAdmin()]
        if self.action in ["retrieve", "update", "partial_update", "destroy", "activate", "deactivate"]:
            return [IsAuthenticated(), IsOwnerOrAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()

        if user.is_superuser or get_role_name(user) == "superadmin":
            queryset = queryset.filter(role__nombre__in=["superadmin", "admin"])
        elif get_role_name(user) == "admin" and user.clinica_id:
            queryset = queryset.filter(clinica_id=user.clinica_id)
        else:
            queryset = queryset.filter(id=user.id)

        role = self.request.query_params.get("role")
        clinic = self.request.query_params.get("clinic") or self.request.query_params.get("clinica")
        is_active = self.request.query_params.get("is_active") or self.request.query_params.get("activo")
        search = self.request.query_params.get("search")

        if role:
            queryset = queryset.filter(role__nombre=role)
        if clinic:
            queryset = queryset.filter(clinica_id=clinic)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() in ["1", "true", "yes", "si"])
        if search:
            queryset = queryset.filter(Q(nombre_completo__icontains=search) | Q(email__icontains=search))

        return queryset

    def _is_last_active_superadmin(self, user):
        return (
            user.is_active
            and get_role_name(user) == "superadmin"
            and User.objects.filter(is_active=True, role__nombre="superadmin").exclude(id=user.id).count() == 0
        )

    def _deactivate_user(self, request, user):
        if user == request.user and self._is_last_active_superadmin(user):
            return Response(
                {"detail": "No puedes desactivar el ultimo superadmin activo."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if self._is_last_active_superadmin(user):
            return Response(
                {"detail": "No se puede desactivar el ultimo superadmin activo."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.is_active = False
        user.save(update_fields=["is_active"])
        log_audit_event(request=request, clinic=getattr(user, "clinica", None), action=AuditLog.Action.DEACTIVATE, module=AuditLog.Module.USERS, model_name="User", object_id=user.id, object_repr=user.email, description="Usuario desactivado.", new_values={"is_active": False})
        return Response(UserDetailSerializer(user).data)

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        if response.status_code == status.HTTP_201_CREATED:
            created = User.objects.filter(id=response.data.get("id")).select_related("role", "clinica").first()
            log_audit_event(request=request, clinic=getattr(created, "clinica", None), action=AuditLog.Action.CREATE, module=AuditLog.Module.USERS, model_name="User", object_id=response.data.get("id"), object_repr=response.data.get("email", ""), description="Usuario creado.", new_values=request.data)
        return response

    def update(self, request, *args, **kwargs):
        target = self.get_object()
        old_values = get_object_audit_data(target)
        response = super().update(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            target.refresh_from_db()
            action = AuditLog.Action.PERMISSION_CHANGE if "role" in request.data or "permissions" in request.data else AuditLog.Action.UPDATE
            log_audit_event(request=request, clinic=getattr(target, "clinica", None), action=action, module=AuditLog.Module.USERS, model_name="User", object_id=target.id, object_repr=target.email, description="Usuario actualizado.", old_values=old_values, new_values=request.data)
        return response

    def destroy(self, request, *args, **kwargs):
        response = self._deactivate_user(request, self.get_object())
        if response.status_code == status.HTTP_200_OK:
            return Response(status=status.HTTP_204_NO_CONTENT)
        return response

    @action(detail=True, methods=["patch"])
    def activate(self, request, pk=None):
        user = self.get_object()
        user.is_active = True
        user.save(update_fields=["is_active"])
        log_audit_event(request=request, clinic=getattr(user, "clinica", None), action=AuditLog.Action.ACTIVATE, module=AuditLog.Module.USERS, model_name="User", object_id=user.id, object_repr=user.email, description="Usuario activado.", new_values={"is_active": True})
        return Response(UserDetailSerializer(user).data)

    @action(detail=True, methods=["patch"])
    def deactivate(self, request, pk=None):
        return self._deactivate_user(request, self.get_object())


class RoleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Role.objects.filter(activo=True)
    serializer_class = RoleSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if get_role_name(self.request.user) == "admin":
            return queryset.exclude(nombre="superadmin")
        return queryset

    @action(detail=False, methods=["get"])
    def permissions(self, request):
        return Response(ROLE_PERMISSION_GROUPS)


class ClinicAdminDashboardView(APIView):
    permission_classes = [IsClinicAdmin]

    def _get_clinic(self, request):
        if get_role_name(request.user) == "superadmin":
            clinic_id = request.query_params.get("clinic_id")
            if clinic_id:
                return Clinic.objects.filter(id=clinic_id).first()
        return request.user.clinica

    def get(self, request):
        clinic = self._get_clinic(request)
        if not clinic:
            return Response({"detail": "No se encontró una clínica asociada a tu cuenta."}, status=status.HTTP_404_NOT_FOUND)
        data = build_clinic_admin_dashboard(request, clinic)
        users = data["users"]
        data.update(
            {
                "clinic": MyClinicSerializer(clinic).data,
                "total_users": users["total"],
                "active_users": users["active"],
                "inactive_users": users["inactive"],
                "total_medicos": users["active_doctors"],
                "total_enfermeras": User.objects.filter(clinica=clinic, role__nombre="enfermera", is_active=True).count(),
                "total_recepcionistas": User.objects.filter(clinica=clinic, role__nombre__in=["recepcionista", "recepcionista_caja"], is_active=True).count(),
                "total_pacientes": User.objects.filter(clinica=clinic, role__nombre="paciente", is_active=True).count(),
                "alerts": build_clinic_admin_alerts(clinic),
            }
        )
        log_audit_event(request=request, clinic=clinic, action=AuditLog.Action.VIEW, module=AuditLog.Module.REPORTS, model_name="ClinicAdminDashboard", object_id=clinic.id, description="Dashboard administrativo de clínica consultado.", metadata={"period": data["period"]["key"]})
        return Response(data)


class ClinicAdminAlertsView(APIView):
    permission_classes = [IsClinicAdmin]

    def get(self, request):
        clinic = getattr(request.user, "clinica", None)
        if not clinic:
            return Response({"detail": "No se encontró una clínica asociada a tu cuenta."}, status=status.HTTP_404_NOT_FOUND)
        alerts = build_clinic_admin_alerts(clinic)
        log_audit_event(request=request, clinic=clinic, action=AuditLog.Action.VIEW, module=AuditLog.Module.SYSTEM, model_name="ClinicAdminAlert", description="Alertas operativas de la clínica consultadas.", metadata={"count": len(alerts)})
        return Response({"count": len(alerts), "results": alerts, "last_updated": timezone.now()})


class ClinicAdminOperationStatusView(APIView):
    permission_classes = [IsClinicAdmin]

    def get(self, request):
        clinic = getattr(request.user, "clinica", None)
        if not clinic:
            return Response({"detail": "No se encontró una clínica asociada a tu cuenta."}, status=status.HTTP_404_NOT_FOUND)
        dashboard = build_clinic_admin_dashboard(request, clinic)
        log_audit_event(request=request, clinic=clinic, action=AuditLog.Action.VIEW, module=AuditLog.Module.SYSTEM, model_name="ClinicOperationStatus", object_id=clinic.id, description="Estado operativo de la clínica consultado.")
        return Response({
            "clinic": dashboard["clinic"],
            "operation_status": dashboard["operation_status"],
            "users": dashboard["users"],
            "inventory": dashboard["inventory"],
            "alerts_count": len(build_clinic_admin_alerts(clinic)),
        })


class MyClinicView(APIView):
    permission_classes = [IsClinicAdmin]

    def get_clinic(self, request):
        if get_role_name(request.user) == "superadmin":
            clinic_id = request.query_params.get("clinic_id")
            if clinic_id:
                return Clinic.objects.filter(id=clinic_id).first()
        return request.user.clinica

    def get(self, request):
        clinic = self.get_clinic(request)
        if not clinic:
            return Response({"detail": "No hay clínica disponible."}, status=status.HTTP_404_NOT_FOUND)
        return Response(MyClinicSerializer(clinic).data)

    def patch(self, request):
        clinic = self.get_clinic(request)
        if not clinic:
            return Response({"detail": "No hay clínica disponible."}, status=status.HTTP_404_NOT_FOUND)
        old_values = get_object_audit_data(clinic)
        serializer = MyClinicSerializer(clinic, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_audit_event(request=request, clinic=clinic, action=AuditLog.Action.SETTINGS_CHANGE, module=AuditLog.Module.CLINICS, model_name="Clinic", object_id=clinic.id, object_repr=clinic.nombre, description="Datos administrativos de la clínica actualizados.", old_values=old_values, new_values=serializer.data)
        return Response(serializer.data)


class ClinicAdminUserPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100


class ClinicAdminUserViewSet(viewsets.ModelViewSet):
    permission_classes = [CanManageClinicUsers]
    pagination_class = ClinicAdminUserPagination
    queryset = User.objects.select_related("role", "clinica")

    def get_serializer_class(self):
        if self.action == "create":
            return ClinicAdminUserCreateSerializer
        if self.action in ["update", "partial_update"]:
            return ClinicAdminUserUpdateSerializer
        return ClinicAdminUserReadSerializer

    def get_clinic(self):
        user = self.request.user
        if get_role_name(user) == "superadmin":
            clinic_id = self.request.query_params.get("clinic_id")
            if clinic_id:
                return Clinic.objects.filter(id=clinic_id).first()
        return user.clinica

    def get_queryset(self):
        clinic = self.get_clinic()
        if not clinic:
            return self.queryset.none()
        active_session = UserSession.objects.filter(user_id=OuterRef("pk"), active=True, expires_at__gt=timezone.now())
        queryset = self.queryset.filter(clinica=clinic).exclude(role__nombre="superadmin").annotate(_has_active_session=Exists(active_session))
        role = self.request.query_params.get("role")
        is_active = self.request.query_params.get("is_active")
        has_session = self.request.query_params.get("has_session")
        search = self.request.query_params.get("search")
        if role:
            queryset = queryset.filter(role__nombre=role)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() in ["1", "true", "yes", "si"])
        if search:
            search = search.strip()
            if len(search) < 2:
                raise serializers.ValidationError({"search": "Escribe al menos dos caracteres para buscar."})
            queryset = queryset.filter(Q(nombre_completo__icontains=search) | Q(email__icontains=search) | Q(telefono__icontains=search))
        if has_session is not None:
            queryset = queryset.filter(_has_active_session=has_session.lower() in ["1", "true", "yes", "si"])
        return queryset

    def get_object(self):
        try:
            return super().get_object()
        except Http404:
            log_audit_event(
                request=self.request,
                clinic=getattr(self.request.user, "clinica", None),
                action=AuditLog.Action.PERMISSION_DENIED,
                module=AuditLog.Module.USERS,
                model_name="User",
                object_id=self.kwargs.get(self.lookup_field or "pk"),
                description="Intento bloqueado de acceder a un usuario fuera del alcance administrativo.",
                status=AuditLog.Status.FAILED,
                severity=AuditLog.Severity.WARNING,
            )
            raise

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["clinic_id"] = self.request.query_params.get("clinic_id")
        return context

    def _is_last_active_clinic_admin(self, user):
        return (
            user.is_active
            and get_role_name(user) == "admin"
            and user.clinica_id
            and User.objects.filter(clinica_id=user.clinica_id, role__nombre="admin", is_active=True)
            .exclude(id=user.id)
            .count()
            == 0
        )

    def _action_reason(self):
        reason = str(self.request.data.get("reason") or self.request.data.get("motivo") or "").strip()
        return reason if len(reason) >= 5 else ""

    def _serialize_user(self, user):
        active = UserSession.objects.filter(user=user, active=True, expires_at__gt=timezone.now()).exists()
        user._has_active_session = active
        return ClinicAdminUserReadSerializer(user).data

    def _duplicate_response(self):
        return Response({"detail": "Ya existe un usuario con esta información."}, status=status.HTTP_409_CONFLICT)

    def _audit_forbidden_role(self):
        requested_role = str(self.request.data.get("role") or "").strip()
        if requested_role and requested_role not in CLINIC_ADMIN_MANAGED_ROLES:
            log_audit_event(
                request=self.request,
                clinic=getattr(self.request.user, "clinica", None),
                action=AuditLog.Action.PERMISSION_DENIED,
                module=AuditLog.Module.USERS,
                model_name="Role",
                object_repr=requested_role,
                description="Intento bloqueado de asignar un rol no permitido por un administrador de clínica.",
                status=AuditLog.Status.FAILED,
                severity=AuditLog.Severity.WARNING,
                metadata={"requested_role": requested_role},
            )

    def _deactivate_user(self, user):
        reason = self._action_reason()
        if not reason:
            return Response({"reason": "El motivo es obligatorio y debe tener al menos 5 caracteres."}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            user = User.objects.select_for_update().select_related("role", "clinica").get(pk=user.pk)
            if self._is_last_active_clinic_admin(user):
                return Response({"detail": "No puedes desactivar el último administrador activo de la clínica."}, status=status.HTTP_400_BAD_REQUEST)
            active_sessions = UserSession.objects.select_for_update().filter(user=user, active=True).count()
            user.is_active = False
            user.save(update_fields=["is_active"])
            revoke_all_user_sessions(user, revoked_by=self.request.user)
            log_audit_event(request=self.request, clinic=user.clinica, action=AuditLog.Action.DEACTIVATE, module=AuditLog.Module.USERS, model_name="User", object_id=user.id, object_repr=user.email, description="Usuario de clínica desactivado y sesiones revocadas.", old_values={"is_active": True}, new_values={"is_active": False, "reason": reason}, metadata={"sessions_revoked": active_sessions})
        return Response(self._serialize_user(user))

    def create(self, request, *args, **kwargs):
        self._audit_forbidden_role()
        email = User.objects.normalize_email(str(request.data.get("email") or ""))
        if email and User.objects.filter(email__iexact=email).exists():
            return self._duplicate_response()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                created = serializer.save()
                log_audit_event(request=request, clinic=created.clinica, action=AuditLog.Action.CREATE, module=AuditLog.Module.USERS, model_name="User", object_id=created.id, object_repr=created.email, description="Usuario de clínica creado.", new_values={"email": created.email, "nombre_completo": created.nombre_completo, "telefono": created.telefono, "role": get_role_name(created), "is_active": created.is_active})
        except IntegrityError:
            return self._duplicate_response()
        return Response(self._serialize_user(created), status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="create-staff")
    def create_staff(self, request):
        self._audit_forbidden_role()
        email = User.objects.normalize_email(str(request.data.get("email") or ""))
        if email and User.objects.filter(email__iexact=email).exists():
            return self._duplicate_response()
        try:
            with transaction.atomic():
                user_serializer = ClinicAdminUserCreateSerializer(data=request.data, context=self.get_serializer_context())
                user_serializer.is_valid(raise_exception=True)
                user = user_serializer.save()
                doctor_profile = None
                if user.role and user.role.nombre == "medico":
                    profile_payload = dict(request.data.get("doctor_profile") or {})
                    profile_payload["user"] = user.id
                    doctor_serializer = DoctorProfileCreateSerializer(data=profile_payload, context={"request": request})
                    doctor_serializer.is_valid(raise_exception=True)
                    doctor_profile = doctor_serializer.save()
                log_audit_event(request=request, clinic=user.clinica, action=AuditLog.Action.CREATE, module=AuditLog.Module.USERS, model_name="User", object_id=user.id, object_repr=user.email, description="Personal de clínica creado desde el módulo administrativo.", new_values={"role": get_role_name(user), "doctor_profile": getattr(doctor_profile, "id", None)})
                if doctor_profile:
                    log_audit_event(request=request, clinic=user.clinica, action=AuditLog.Action.CREATE, module=AuditLog.Module.DOCTORS, model_name="DoctorProfile", object_id=doctor_profile.id, object_repr=str(doctor_profile), description="Perfil médico creado junto con el usuario desde administración de clínica.", new_values={"user": user.id, "specialty": doctor_profile.specialty_id, "activo": doctor_profile.activo})
        except IntegrityError:
            return self._duplicate_response()
        data = self._serialize_user(user)
        if doctor_profile:
            data["doctor_profile"] = DoctorProfileDetailSerializer(doctor_profile).data
        return Response(data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        self._audit_forbidden_role()
        with transaction.atomic():
            target = User.objects.select_for_update().select_related("role", "clinica").get(pk=self.get_object().pk)
            old_values = get_object_audit_data(target)
            old_role = get_role_name(target)
            serializer = ClinicAdminUserUpdateSerializer(target, data=request.data, partial=kwargs.get("partial", False), context=self.get_serializer_context())
            serializer.is_valid(raise_exception=True)
            requested_role = serializer.validated_data.get("role")
            if requested_role and requested_role != old_role and self._is_last_active_clinic_admin(target):
                return Response({"detail": "No puedes cambiar el rol del último administrador activo de la clínica."}, status=status.HTTP_400_BAD_REQUEST)
            target = serializer.save()
            new_role = get_role_name(target)
            sessions_revoked = 0
            if new_role != old_role:
                sessions_revoked = UserSession.objects.select_for_update().filter(user=target, active=True).count()
                revoke_all_user_sessions(target, revoked_by=request.user)
                doctor_profile = getattr(target, "doctor_profile", None)
                if doctor_profile:
                    doctor_profile.activo = new_role == "medico"
                    doctor_profile.save(update_fields=["activo", "actualizado_en"])
            action_name = AuditLog.Action.PERMISSION_CHANGE if new_role != old_role else AuditLog.Action.UPDATE
            log_audit_event(request=request, clinic=target.clinica, action=action_name, module=AuditLog.Module.USERS, model_name="User", object_id=target.id, object_repr=target.email, description="Usuario de clínica actualizado.", old_values=old_values, new_values={"email": target.email, "nombre_completo": target.nombre_completo, "telefono": target.telefono, "role": new_role}, metadata={"sessions_revoked": sessions_revoked})
        return Response(self._serialize_user(target))

    @action(detail=True, methods=["patch"])
    def activate(self, request, pk=None):
        reason = self._action_reason()
        if not reason:
            return Response({"reason": "El motivo es obligatorio y debe tener al menos 5 caracteres."}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            user = User.objects.select_for_update().select_related("role", "clinica").get(pk=self.get_object().pk)
            user.is_active = True
            user.save(update_fields=["is_active"])
            log_audit_event(request=request, clinic=user.clinica, action=AuditLog.Action.ACTIVATE, module=AuditLog.Module.USERS, model_name="User", object_id=user.id, object_repr=user.email, description="Usuario de clínica reactivado; debe iniciar una sesión nueva.", old_values={"is_active": False}, new_values={"is_active": True, "reason": reason})
        return Response(self._serialize_user(user))

    @action(detail=True, methods=["patch"])
    def deactivate(self, request, pk=None):
        return self._deactivate_user(self.get_object())

    @action(detail=True, methods=["post"], url_path="revoke-sessions")
    def revoke_sessions(self, request, pk=None):
        reason = self._action_reason()
        if not reason:
            return Response({"reason": "El motivo es obligatorio y debe tener al menos 5 caracteres."}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            user = User.objects.select_for_update().select_related("role", "clinica").get(pk=self.get_object().pk)
            sessions = UserSession.objects.select_for_update().filter(user=user, active=True)
            revoked = sessions.count()
            revoke_all_user_sessions(user, revoked_by=request.user)
            log_audit_event(request=request, clinic=user.clinica, action=AuditLog.Action.UPDATE, module=AuditLog.Module.SECURITY, model_name="UserSession", object_id=user.id, object_repr=user.email, description="Todas las sesiones activas del usuario fueron revocadas.", new_values={"reason": reason}, metadata={"sessions_revoked": revoked})
        return Response({"detail": "Sesiones revocadas correctamente.", "sessions_revoked": revoked})

    @action(detail=True, methods=["post"], url_path="reset-password")
    def reset_password(self, request, pk=None):
        user = self.get_object()
        if not user.is_active:
            return Response({"detail": "Activa la cuenta antes de enviar una recuperación de contraseña."}, status=status.HTTP_400_BAD_REQUEST)
        create_password_reset_token(user, request)
        log_audit_event(request=request, clinic=user.clinica, action=AuditLog.Action.PASSWORD_RESET, module=AuditLog.Module.AUTH, model_name="User", object_id=user.id, object_repr=user.email, description="Administrador de clínica solicitó restablecimiento de contraseña para un usuario.", metadata={"target_user_id": user.id})
        return Response({"detail": "Se enviaron las instrucciones de recuperación al correo del usuario."})

    def destroy(self, request, *args, **kwargs):
        response = self._deactivate_user(self.get_object())
        return Response(status=status.HTTP_204_NO_CONTENT) if response.status_code == status.HTTP_200_OK else response
