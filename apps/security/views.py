from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
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
    return get_role_name(request_user) == "admin" and request_user.clinica_id and target_user.clinica_id == request_user.clinica_id


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    serializer_class = PasswordResetRequestSerializer

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
    serializer_class = UserSessionSerializer

    def get(self, request):
        qs = UserSession.objects.filter(user=request.user).select_related("user")
        current = request.headers.get("X-Session-Key", "")
        return Response(UserSessionSerializer(qs, many=True, context={"current_session_key": current}).data)


class UserSessionRevokeView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSessionSerializer

    def patch(self, request, session_id):
        session = UserSession.objects.filter(id=session_id, user=request.user).first()
        if not session:
            return Response({"detail": "Sesion no encontrada."}, status=status.HTTP_404_NOT_FOUND)
        revoke_user_session(session, revoked_by=request.user)
        return Response(UserSessionSerializer(session).data)


class UserSessionsRevokeAllView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = RevokeAllSessionsSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        keep_current = serializer.validated_data.get("keep_current", True)
        current = request.headers.get("X-Session-Key") if keep_current else None
        revoke_all_user_sessions(request.user, keep_current=current, revoked_by=request.user)
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
            qs = qs.filter(user__clinica_id=request.user.clinica_id)
        else:
            return qs.none()
        if request.query_params.get("user"):
            qs = qs.filter(user_id=request.query_params["user"])
        if request.query_params.get("active") is not None:
            qs = qs.filter(active=str(request.query_params["active"]).lower() in ["1", "true", "yes", "si"])
        return qs

    def get(self, request):
        if get_role_name(request.user) not in ["superadmin", "admin"]:
            return Response({"detail": "No tienes permiso para ver sesiones."}, status=status.HTTP_403_FORBIDDEN)
        return Response(UserSessionSerializer(self.get_queryset(request), many=True).data)


class AdminSessionRevokeView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSessionSerializer

    def patch(self, request, session_id):
        session = UserSession.objects.select_related("user", "user__clinica").filter(id=session_id).first()
        if not session:
            return Response({"detail": "Sesion no encontrada."}, status=status.HTTP_404_NOT_FOUND)
        if not can_manage_user(request.user, session.user):
            return Response({"detail": "No tienes permiso para revocar esta sesion."}, status=status.HTTP_403_FORBIDDEN)
        revoke_user_session(session, revoked_by=request.user)
        return Response(UserSessionSerializer(session).data)


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
