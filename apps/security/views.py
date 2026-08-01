from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.accounts.permissions import get_role_name
from apps.audit.models import AuditLog
from apps.audit.services import log_audit_event
from apps.security.models import AccountLock, SecuritySetting, UserSession
from apps.security.serializers import (
    AccountLockSerializer,
    AccountLockStatusSerializer,
    EmptySerializer,
    EmailVerificationConfirmSerializer,
    EmailVerificationStatusSerializer,
    PasswordPolicyValidateSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    OwnUserSessionSerializer,
    RevokeAllSessionsSerializer,
    SecuritySettingSerializer,
    UserSessionSerializer,
    policy_payload,
)
from apps.security.services import active_lock, confirm_email_verification, confirm_password_reset, create_email_verification_token, create_password_reset_token, get_security_settings, revoke_all_user_sessions, revoke_user_session, validate_password_policy


def is_superadmin(user):
    return bool(user and user.is_authenticated and (user.is_superuser or get_role_name(user) == "superadmin"))


def can_manage_user(request_user, target_user):
    if is_superadmin(request_user):
        return True
    return bool(
        get_role_name(request_user) == "admin"
        and request_user.clinica_id
        and target_user.clinica_id == request_user.clinica_id
        and get_role_name(target_user) != "superadmin"
    )


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    serializer_class = PasswordResetRequestSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password_reset"

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        user = User.objects.filter(email__iexact=email, is_active=True).select_related("clinica").first()
        payload = {"detail": "Si el correo existe, enviaremos instrucciones para recuperar la contrasena."}
        if user:
            token, reset_url = create_password_reset_token(user, request)
            if settings.DEBUG:
                payload["reset_url"] = reset_url
                payload["token"] = token
        return Response(payload)


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    serializer_class = PasswordResetConfirmSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            confirm_password_reset(serializer.validated_data["token"], serializer.validated_data["new_password"], request)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "Contrasena actualizada correctamente."})


class EmailVerificationSendView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = EmptySerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "email_verification"

    def post(self, request):
        token, url = create_email_verification_token(request.user, request)
        data = {"detail": "Enviamos instrucciones para verificar tu correo."}
        if settings.DEBUG:
            data["verification_url"] = url
            data["token"] = token
        return Response(data)


class EmailVerificationConfirmView(APIView):
    permission_classes = [AllowAny]
    serializer_class = EmailVerificationConfirmSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            confirm_email_verification(serializer.validated_data["token"], request)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "Correo verificado correctamente."})


class EmailVerificationStatusView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = EmailVerificationStatusSerializer

    def get(self, request):
        return Response({"email": request.user.email, "email_verified": request.user.email_verified})


class AccountLockStatusView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AccountLockStatusSerializer

    def get(self, request):
        lock = active_lock(request.user)
        return Response({
            "locked": bool(lock),
            "locked_until": lock.locked_until if lock else None,
            "reason": lock.reason if lock else "",
            "failed_attempts": lock.failed_attempts if lock else 0,
        })


class AccountLocksView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AccountLockSerializer

    def get_queryset(self, request):
        qs = AccountLock.objects.select_related("user", "user__clinica", "unlocked_by")
        if is_superadmin(request.user):
            if request.query_params.get("clinic"):
                qs = qs.filter(user__clinica_id=request.query_params["clinic"])
        elif get_role_name(request.user) == "admin" and request.user.clinica_id:
            qs = qs.filter(user__clinica_id=request.user.clinica_id)
        else:
            return qs.none()
        if request.query_params.get("user"):
            qs = qs.filter(user_id=request.query_params["user"])
        if request.query_params.get("active") is not None:
            qs = qs.filter(active=str(request.query_params["active"]).lower() in ["1", "true", "yes", "si"])
        if request.query_params.get("date_from"):
            qs = qs.filter(created_at__date__gte=request.query_params["date_from"])
        if request.query_params.get("date_to"):
            qs = qs.filter(created_at__date__lte=request.query_params["date_to"])
        return qs

    def get(self, request):
        if get_role_name(request.user) not in ["superadmin", "admin"]:
            return Response({"detail": "No tienes permiso para ver bloqueos."}, status=status.HTTP_403_FORBIDDEN)
        return Response(AccountLockSerializer(self.get_queryset(request), many=True).data)


class AccountLockUnlockView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AccountLockSerializer

    def patch(self, request, lock_id):
        lock = AccountLock.objects.select_related("user", "user__clinica").filter(id=lock_id).first()
        if not lock:
            return Response({"detail": "Bloqueo no encontrado."}, status=status.HTTP_404_NOT_FOUND)
        if not can_manage_user(request.user, lock.user):
            return Response({"detail": "No tienes permiso para desbloquear esta cuenta."}, status=status.HTTP_403_FORBIDDEN)
        lock.active = False
        lock.unlocked_at = timezone.now()
        lock.unlocked_by = request.user
        lock.save(update_fields=["active", "unlocked_at", "unlocked_by"])
        log_audit_event(request=request, user=lock.user, clinic=lock.user.clinica, action=AuditLog.Action.UPDATE, module=AuditLog.Module.AUTH, model_name="AccountLock", object_id=lock.id, object_repr=lock.user.email, description="Cuenta desbloqueada.")
        return Response(AccountLockSerializer(lock).data)


class UserSessionsView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = OwnUserSessionSerializer

    def get(self, request):
        qs = UserSession.objects.filter(user=request.user, active=True, expires_at__gt=timezone.now()).select_related("user")
        current = request.headers.get("X-Session-Key", "")
        log_audit_event(request=request, action=AuditLog.Action.VIEW, module=AuditLog.Module.SECURITY, model_name="UserSession", description="Usuario consultó sus sesiones activas.")
        return Response(OwnUserSessionSerializer(qs, many=True, context={"current_session_key": current}).data)


class UserSessionRevokeView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = OwnUserSessionSerializer

    def patch(self, request, session_id):
        session = UserSession.objects.filter(id=session_id, user=request.user).first()
        if not session:
            log_audit_event(request=request, action=AuditLog.Action.PERMISSION_DENIED, module=AuditLog.Module.SECURITY, model_name="UserSession", object_id=session_id, description="Intento bloqueado de revocar una sesión ajena.")
            return Response({"detail": "Sesion no encontrada."}, status=status.HTTP_404_NOT_FOUND)
        revoke_user_session(session, revoked_by=request.user)
        log_audit_event(request=request, action=AuditLog.Action.UPDATE, module=AuditLog.Module.SECURITY, model_name="UserSession", object_id=session.id, description="Usuario revocó una sesión propia.", metadata={"current": request.headers.get("X-Session-Key", "") == session.session_key})
        return Response(OwnUserSessionSerializer(session, context={"current_session_key": request.headers.get("X-Session-Key", "")}).data)

    post = patch


class UserSessionsRevokeAllView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = RevokeAllSessionsSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        keep_current = serializer.validated_data.get("keep_current", True)
        current = request.headers.get("X-Session-Key") if keep_current else None
        revoke_all_user_sessions(request.user, keep_current=current, revoked_by=request.user)
        log_audit_event(request=request, action=AuditLog.Action.UPDATE, module=AuditLog.Module.SECURITY, model_name="UserSession", description="Usuario revocó sus demás sesiones.", metadata={"keep_current": keep_current})
        return Response({"detail": "Sesiones revocadas correctamente."})


class AdminSessionsView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSessionSerializer

    def get_queryset(self, request):
        qs = UserSession.objects.select_related("user", "user__clinica")
        if is_superadmin(request.user):
            if request.query_params.get("clinic"):
                qs = qs.filter(user__clinica_id=request.query_params["clinic"])
        elif get_role_name(request.user) == "admin" and request.user.clinica_id:
            qs = qs.filter(user__clinica_id=request.user.clinica_id).exclude(user__role__nombre="superadmin")
        else:
            return qs.none()
        if request.query_params.get("user"):
            qs = qs.filter(user_id=request.query_params["user"])
        if request.query_params.get("active") is not None:
            qs = qs.filter(active=str(request.query_params["active"]).lower() in ["1", "true", "yes", "si"])
        if request.query_params.get("role"):
            qs = qs.filter(user__role__nombre=request.query_params["role"])
        if request.query_params.get("device"):
            qs = qs.filter(device_name__icontains=request.query_params["device"])
        return qs

    def get(self, request):
        if get_role_name(request.user) not in ["superadmin", "admin"]:
            return Response({"detail": "No tienes permiso para ver sesiones."}, status=status.HTTP_403_FORBIDDEN)
        queryset = self.get_queryset(request)
        log_audit_event(request=request, clinic=getattr(request.user, "clinica", None), action=AuditLog.Action.VIEW, module=AuditLog.Module.SECURITY, model_name="UserSession", description="Sesiones activas de la clínica consultadas.", metadata={"count": queryset.count()})
        return Response(UserSessionSerializer(queryset, many=True, context={"current_session_key": request.headers.get("X-Session-Key", "")}).data)


class AdminSessionRevokeView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSessionSerializer

    def patch(self, request, session_id):
        allowed = AdminSessionsView().get_queryset(request)
        session = allowed.filter(id=session_id).first()
        if not session:
            log_audit_event(request=request, clinic=getattr(request.user, "clinica", None), action=AuditLog.Action.PERMISSION_DENIED, module=AuditLog.Module.SECURITY, model_name="UserSession", object_id=session_id, description="Intento bloqueado de revocar una sesión administrativa ajena.", status=AuditLog.Status.FAILED, severity=AuditLog.Severity.WARNING)
            return Response({"detail": "Sesion no encontrada."}, status=status.HTTP_404_NOT_FOUND)
        if not can_manage_user(request.user, session.user):
            return Response({"detail": "No tienes permiso para revocar esta sesion."}, status=status.HTTP_403_FORBIDDEN)
        reason = str(request.data.get("reason") or request.data.get("motivo") or "").strip()
        if len(reason) < 5:
            return Response({"reason": "El motivo es obligatorio y debe tener al menos 5 caracteres."}, status=status.HTTP_400_BAD_REQUEST)
        if not session.active:
            return Response({"detail": "La sesión ya se encuentra cerrada."}, status=status.HTTP_409_CONFLICT)
        revoke_user_session(session, revoked_by=request.user)
        log_audit_event(request=request, clinic=session.user.clinica, action=AuditLog.Action.UPDATE, module=AuditLog.Module.SECURITY, model_name="UserSession", object_id=session.id, object_repr=session.user.email, description="Sesión de usuario revocada por un administrador de clínica.", new_values={"active": False, "reason": reason})
        return Response(UserSessionSerializer(session, context={"current_session_key": request.headers.get("X-Session-Key", "")}).data)

    post = patch


class PasswordPolicyView(APIView):
    permission_classes = [AllowAny]
    serializer_class = PasswordPolicyValidateSerializer

    def get(self, request):
        return Response(policy_payload(getattr(request.user, "clinica", None) if request.user.is_authenticated else None))


class PasswordPolicyValidateView(APIView):
    permission_classes = [AllowAny]
    serializer_class = PasswordPolicyValidateSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data, context={"user": request.user if request.user.is_authenticated else None})
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data["result"])


class SecuritySettingsView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = SecuritySettingSerializer

    def get_setting(self, request):
        clinic = None if is_superadmin(request.user) and request.query_params.get("global") == "true" else getattr(request.user, "clinica", None)
        return get_security_settings(clinic)

    def get(self, request):
        if get_role_name(request.user) not in ["superadmin", "admin"]:
            return Response({"detail": "No tienes permiso para ver configuracion de seguridad."}, status=status.HTTP_403_FORBIDDEN)
        return Response(SecuritySettingSerializer(self.get_setting(request)).data)

    def patch(self, request):
        if get_role_name(request.user) not in ["superadmin", "admin"]:
            return Response({"detail": "No tienes permiso para editar configuracion de seguridad."}, status=status.HTTP_403_FORBIDDEN)
        setting = self.get_setting(request)
        serializer = SecuritySettingSerializer(setting, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_audit_event(request=request, action=AuditLog.Action.UPDATE, module=AuditLog.Module.SETTINGS, model_name="SecuritySetting", object_id=setting.id, description="Configuracion de seguridad actualizada.", new_values=serializer.validated_data)
        return Response(SecuritySettingSerializer(setting).data)
