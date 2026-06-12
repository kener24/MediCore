from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import get_role_name
from apps.clinic_settings.models import ClinicSettings, get_or_create_clinic_settings
from apps.clinic_settings.serializers import ClinicSettingsSerializer, ClinicSettingsSummarySerializer, ClinicSettingsUpdateSerializer, PublicClinicSettingsSerializer
from apps.clinics.models import Clinic


def is_superadmin(user):
    return bool(user and user.is_authenticated and (user.is_superuser or get_role_name(user) == "superadmin"))


def is_admin(user):
    return get_role_name(user) == "admin"


class MyClinicSettingsView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ClinicSettingsSerializer

    def get_object(self, request):
        if not request.user.clinica_id:
            return None
        return get_or_create_clinic_settings(request.user.clinica)

    def get(self, request):
        if not (is_superadmin(request.user) or is_admin(request.user)):
            return Response({"detail": "No tienes permiso para ver configuracion administrativa."}, status=status.HTTP_403_FORBIDDEN)
        settings = self.get_object(request)
        if not settings:
            return Response({"detail": "Tu usuario no tiene clinica asignada."}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ClinicSettingsSerializer(settings).data)

    def patch(self, request):
        if not (is_superadmin(request.user) or is_admin(request.user)):
            return Response({"detail": "No tienes permiso para editar configuracion administrativa."}, status=status.HTTP_403_FORBIDDEN)
        settings = self.get_object(request)
        if not settings:
            return Response({"detail": "Tu usuario no tiene clinica asignada."}, status=status.HTTP_400_BAD_REQUEST)
        serializer = ClinicSettingsUpdateSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ClinicSettingsSerializer(settings).data)


class ClinicSettingsByClinicView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ClinicSettingsSerializer

    def get_settings(self, clinic_id):
        clinic = Clinic.objects.filter(id=clinic_id).first()
        return get_or_create_clinic_settings(clinic) if clinic else None

    def get(self, request, clinic_id):
        if not is_superadmin(request.user):
            return Response({"detail": "Solo superadmin puede consultar configuracion de otras clinicas."}, status=status.HTTP_403_FORBIDDEN)
        settings = self.get_settings(clinic_id)
        if not settings:
            return Response({"detail": "Clinica no encontrada."}, status=status.HTTP_404_NOT_FOUND)
        return Response(ClinicSettingsSerializer(settings).data)

    def patch(self, request, clinic_id):
        if not is_superadmin(request.user):
            return Response({"detail": "Solo superadmin puede editar configuracion de otras clinicas."}, status=status.HTTP_403_FORBIDDEN)
        settings = self.get_settings(clinic_id)
        if not settings:
            return Response({"detail": "Clinica no encontrada."}, status=status.HTTP_404_NOT_FOUND)
        serializer = ClinicSettingsUpdateSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ClinicSettingsSerializer(settings).data)


class PublicClinicSettingsView(APIView):
    permission_classes = [AllowAny]
    serializer_class = PublicClinicSettingsSerializer

    def get(self, request, clinic_id):
        clinic = Clinic.objects.filter(id=clinic_id).first()
        if not clinic:
            return Response({"detail": "Clinica no encontrada."}, status=status.HTTP_404_NOT_FOUND)
        settings = get_or_create_clinic_settings(clinic)
        return Response(PublicClinicSettingsSerializer(settings).data)


class ClinicSettingsSummaryView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ClinicSettingsSummarySerializer

    def get(self, request):
        if not is_superadmin(request.user):
            return Response({"detail": "Solo superadmin puede ver este resumen."}, status=status.HTTP_403_FORBIDDEN)
        total = Clinic.objects.count()
        configured = ClinicSettings.objects.count()
        data = {
            "total_clinics": total,
            "configured_clinics": configured,
            "missing_settings": max(total - configured, 0),
            "patient_portal_enabled": ClinicSettings.objects.filter(allow_patient_portal=True).count(),
            "online_appointments_enabled": ClinicSettings.objects.filter(allow_online_appointments=True).count(),
        }
        return Response(ClinicSettingsSummarySerializer(data).data)
