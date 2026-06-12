from django.db.models import Count, Q
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.accounts.models import Role, User
from apps.accounts.permissions import CanManageClinicUsers, IsClinicAdmin, IsOwnerOrAdmin, IsSuperAdmin, get_role_name
from apps.accounts.serializers import (
    ChangePasswordSerializer,
    ClinicAdminUserCreateSerializer,
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
from apps.audit.services import log_audit_event
from apps.security.services import active_lock, create_user_session, record_login_attempt, register_failed_login, revoke_all_user_sessions


class LoginSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        email = attrs.get("email", "")
        candidate = User.objects.filter(email__iexact=email).select_related("clinica").first()
        if candidate:
            lock = active_lock(candidate)
            if lock:
                raise serializers.ValidationError({"detail": f"Cuenta bloqueada temporalmente hasta {lock.locked_until}."})
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
        log_audit_event(request=request, action=AuditLog.Action.LOGIN_FAILED, module=AuditLog.Module.AUTH, object_repr=email, description="Intento fallido de login.", severity=AuditLog.Severity.WARNING, metadata={"email": email})
        return super().handle_exception(exc)


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
        return Response({"detail": "Contrasena actualizada correctamente."})


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
            pass
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
        return Response(UserDetailSerializer(user).data)

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
        return Response(UserDetailSerializer(user).data)

    @action(detail=True, methods=["patch"])
    def deactivate(self, request, pk=None):
        return self._deactivate_user(request, self.get_object())


class RoleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Role.objects.filter(activo=True)
    serializer_class = RoleSerializer


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
            return Response({"detail": "No hay clínica disponible."}, status=status.HTTP_404_NOT_FOUND)

        users = User.objects.filter(clinica=clinic)
        total_users = users.count()
        active_users = users.filter(is_active=True).count()
        role_counts = {
            item["role__nombre"]: item["total"]
            for item in users.values("role__nombre").annotate(total=Count("id"))
        }
        return Response(
            {
                "clinic": MyClinicSerializer(clinic).data,
                "total_users": total_users,
                "active_users": active_users,
                "inactive_users": total_users - active_users,
                "total_medicos": role_counts.get("medico", 0),
                "total_enfermeras": role_counts.get("enfermera", 0),
                "total_recepcionistas": role_counts.get("recepcionista", 0),
                "total_pacientes": role_counts.get("paciente", 0),
            }
        )


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
        serializer = MyClinicSerializer(clinic, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ClinicAdminUserViewSet(viewsets.ModelViewSet):
    permission_classes = [CanManageClinicUsers]
    queryset = User.objects.select_related("role", "clinica")

    def get_serializer_class(self):
        if self.action == "create":
            return ClinicAdminUserCreateSerializer
        if self.action in ["update", "partial_update"]:
            return ClinicAdminUserUpdateSerializer
        return UserDetailSerializer

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
        queryset = self.queryset.filter(clinica=clinic)
        role = self.request.query_params.get("role")
        is_active = self.request.query_params.get("is_active")
        search = self.request.query_params.get("search")
        if role:
            queryset = queryset.filter(role__nombre=role)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() in ["1", "true", "yes", "si"])
        if search:
            queryset = queryset.filter(Q(nombre_completo__icontains=search) | Q(email__icontains=search))
        return queryset

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

    def _deactivate_user(self, user):
        if self._is_last_active_clinic_admin(user):
            return Response(
                {"detail": "No puedes desactivar el último admin activo de la clínica."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.is_active = False
        user.save(update_fields=["is_active"])
        return Response(UserDetailSerializer(user).data)

    @action(detail=True, methods=["patch"])
    def activate(self, request, pk=None):
        user = self.get_object()
        user.is_active = True
        user.save(update_fields=["is_active"])
        return Response(UserDetailSerializer(user).data)

    @action(detail=True, methods=["patch"])
    def deactivate(self, request, pk=None):
        return self._deactivate_user(self.get_object())
