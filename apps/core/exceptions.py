import logging

from rest_framework.exceptions import Throttled
from rest_framework.response import Response
from rest_framework.views import exception_handler


logger = logging.getLogger(__name__)


def medicore_exception_handler(exc, context):
    request = context.get("request")
    request_id = getattr(request, "request_id", "")
    response = exception_handler(exc, context)

    if response is None:
        logger.exception("Unhandled API exception", extra={"request_id": request_id})
        return Response(
            {"detail": "Ocurrió un error en el servidor.", "request_id": request_id},
            status=500,
        )

    if response.status_code >= 500:
        response.data = {"detail": "Ocurrió un error en el servidor.", "request_id": request_id}
        return response

    if isinstance(exc, Throttled):
        response.data = {
            "detail": "Demasiados intentos. Espera un momento antes de intentarlo nuevamente.",
            "request_id": request_id,
            "retry_after": exc.wait,
        }
    elif isinstance(response.data, dict) and response.status_code >= 400:
        response.data.setdefault("request_id", request_id)
    return response
