from apps.audit.models import AuditLog
from apps.audit.services import log_audit_event


class AuditPermissionDeniedMiddleware:
    """Record authenticated 403 responses without persisting request payloads."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        user = getattr(request, "user", None)
        if response.status_code == 403 and user and user.is_authenticated:
            log_audit_event(
                request=request,
                action=AuditLog.Action.PERMISSION_DENIED,
                module=AuditLog.Module.SECURITY,
                model_name="ProtectedEndpoint",
                description="Solicitud autenticada bloqueada por permisos.",
                status=AuditLog.Status.FAILED,
                severity=AuditLog.Severity.WARNING,
                metadata={"method": request.method, "path": request.path},
            )
        return response
