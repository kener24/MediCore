import logging
import time
import uuid

from django.conf import settings

from apps.core.request_context import current_request_id


performance_logger = logging.getLogger("apps.performance")


class RequestIDMiddleware:
    """Attach a validated correlation ID to every request and response."""

    header_name = "HTTP_X_REQUEST_ID"

    def __init__(self, get_response):
        self.get_response = get_response

    @staticmethod
    def _resolve_request_id(raw_value):
        try:
            return str(uuid.UUID(str(raw_value)))
        except (TypeError, ValueError, AttributeError):
            return str(uuid.uuid4())

    def __call__(self, request):
        request.request_id = self._resolve_request_id(request.META.get(self.header_name))
        context_token = current_request_id.set(request.request_id)
        try:
            response = self.get_response(request)
            if response.status_code >= 400 and isinstance(getattr(response, "data", None), dict):
                response.data.setdefault("request_id", request.request_id)
            response["X-Request-ID"] = request.request_id
            return response
        finally:
            current_request_id.reset(context_token)


class RequestPerformanceMiddleware:
    """Record safe request timing without query strings, payloads, or patient data."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        started = time.perf_counter()
        response = self.get_response(request)
        duration_ms = round((time.perf_counter() - started) * 1000, 2)
        if getattr(settings, "REQUEST_METRICS_ENABLED", True) and (
            request.path.startswith("/api/") or request.path.startswith("/health")
        ):
            level = logging.WARNING if duration_ms >= settings.SLOW_REQUEST_THRESHOLD_MS else logging.INFO
            performance_logger.log(
                level,
                "request method=%s path=%s status=%s duration_ms=%.2f",
                request.method,
                request.path,
                response.status_code,
                duration_ms,
            )
        response["Server-Timing"] = f"app;dur={duration_ms:.2f}"
        return response
