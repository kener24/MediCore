from django.db import connection
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class BaseHealthView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = []

    @staticmethod
    def response(payload, response_status=status.HTTP_200_OK):
        response = Response(payload, status=response_status)
        response["Cache-Control"] = "no-store"
        return response


class HealthView(BaseHealthView):
    def get(self, request):
        return self.response({"status": "ok"})


class LivenessView(BaseHealthView):
    def get(self, request):
        return self.response({"status": "ok"})


class ReadinessView(BaseHealthView):
    def get(self, request):
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
        except Exception:
            return self.response(
                {"status": "unavailable", "database": "unavailable"},
                status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return self.response({"status": "ok", "database": "ok"})
