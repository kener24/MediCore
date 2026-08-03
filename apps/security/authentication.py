from django.utils import timezone
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.security.models import UserSession


class SessionBoundJWTAuthentication(JWTAuthentication):
    """Bind every authenticated JWT request to an active MediCore session."""

    def authenticate(self, request):
        authenticated = super().authenticate(request)
        if authenticated is None:
            return None

        user, validated_token = authenticated
        session_key = request.headers.get("X-Session-Key", "").strip()
        if not session_key:
            raise AuthenticationFailed("La sesión no es válida. Inicia sesión nuevamente.")
        if validated_token.get("sid") != session_key:
            raise AuthenticationFailed("La sesión no corresponde al token presentado.")

        session = UserSession.objects.filter(
            user=user,
            session_key=session_key,
            active=True,
            expires_at__gt=timezone.now(),
        ).first()
        if not session:
            raise AuthenticationFailed("Tu sesión expiró o fue revocada. Inicia sesión nuevamente.")
        if not user.is_active:
            raise AuthenticationFailed("Tu usuario se encuentra inactivo.")
        if user.clinica_id and not user.clinica.activo:
            raise AuthenticationFailed("Tu clínica se encuentra inactiva.")

        now = timezone.now()
        if (now - session.last_activity_at).total_seconds() >= 60:
            session.last_activity_at = now
            session.save(update_fields=["last_activity_at"])
        request.medicore_session = session
        return user, validated_token
