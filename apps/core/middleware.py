import uuid

from apps.core.request_context import current_request_id


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
