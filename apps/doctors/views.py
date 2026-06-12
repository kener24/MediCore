from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsSuperAdmin, get_role_name
from apps.doctors.models import DoctorProfile, DoctorSchedule, MedicalSpecialty
from apps.doctors.serializers import (
    DoctorProfileCreateSerializer,
    DoctorProfileDetailSerializer,
    DoctorProfileListSerializer,
    DoctorProfileUpdateSerializer,
    DoctorScheduleSerializer,
    MedicalSpecialtySerializer,
)


class SpecialtyViewSet(viewsets.ModelViewSet):
    queryset = MedicalSpecialty.objects.all()
    serializer_class = MedicalSpecialtySerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsSuperAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        queryset = super().get_queryset()
        is_active = self.request.query_params.get("is_active")
        search = self.request.query_params.get("search")
        if is_active is not None:
            queryset = queryset.filter(activo=is_active.lower() in ["1", "true", "yes", "si"])
        if search:
            queryset = queryset.filter(Q(nombre__icontains=search) | Q(descripcion__icontains=search))
        return queryset

    def destroy(self, request, *args, **kwargs):
        specialty = self.get_object()
        specialty.activo = False
        specialty.save(update_fields=["activo"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class DoctorProfileViewSet(viewsets.ModelViewSet):
    queryset = DoctorProfile.objects.select_related("clinic", "user", "specialty").prefetch_related("schedules")

    def get_serializer_class(self):
        if self.action == "list":
            return DoctorProfileListSerializer
        if self.action == "create":
            return DoctorProfileCreateSerializer
        if self.action in ["update", "partial_update"]:
            return DoctorProfileUpdateSerializer
        return DoctorProfileDetailSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        role = get_role_name(user)
        if role == "superadmin" or user.is_superuser:
            pass
        elif role == "admin":
            queryset = queryset.filter(clinic_id=user.clinica_id)
        elif role == "medico":
            queryset = queryset.filter(user=user)
        else:
            queryset = queryset.none()

        specialty = self.request.query_params.get("specialty")
        is_active = self.request.query_params.get("is_active")
        search = self.request.query_params.get("search")
        if specialty:
            queryset = queryset.filter(specialty_id=specialty)
        if is_active is not None:
            queryset = queryset.filter(activo=is_active.lower() in ["1", "true", "yes", "si"])
        if search:
            queryset = queryset.filter(
                Q(user__nombre_completo__icontains=search)
                | Q(user__email__icontains=search)
                | Q(numero_colegiacion__icontains=search)
            )
        return queryset

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy", "activate", "deactivate"]:
            return [IsAuthenticated()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        if get_role_name(request.user) not in ["superadmin", "admin"]:
            return Response({"detail": "No tienes permiso para administrar medicos."}, status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        doctor = self.get_object()
        if get_role_name(request.user) == "admin" and doctor.clinic_id != request.user.clinica_id:
            return Response({"detail": "No tienes permiso para modificar este medico."}, status=status.HTTP_403_FORBIDDEN)
        if get_role_name(request.user) not in ["superadmin", "admin"]:
            return Response({"detail": "No tienes permiso para administrar medicos."}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        doctor = self.get_object()
        doctor.activo = False
        doctor.save(update_fields=["activo"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["get"], url_path="me")
    def me(self, request):
        if get_role_name(request.user) != "medico":
            return Response({"detail": "Solo disponible para medicos."}, status=status.HTTP_403_FORBIDDEN)
        doctor = DoctorProfile.objects.filter(user=request.user).select_related("clinic", "user", "specialty").first()
        if not doctor:
            return Response({"detail": "Aun no tienes perfil medico configurado."}, status=status.HTTP_404_NOT_FOUND)
        return Response(DoctorProfileDetailSerializer(doctor).data)

    @action(detail=True, methods=["get", "post"], url_path="schedules")
    def schedules(self, request, pk=None):
        doctor = self.get_object()
        role = get_role_name(request.user)
        if request.method == "POST" and role not in ["superadmin", "admin"]:
            return Response({"detail": "No tienes permiso para administrar horarios."}, status=status.HTTP_403_FORBIDDEN)
        if role == "admin" and doctor.clinic_id != request.user.clinica_id:
            return Response({"detail": "No tienes permiso para administrar este medico."}, status=status.HTTP_403_FORBIDDEN)
        if request.method == "GET":
            serializer = DoctorScheduleSerializer(doctor.schedules.all(), many=True)
            return Response(serializer.data)
        serializer = DoctorScheduleSerializer(data=request.data, context={"doctor": doctor})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get", "patch", "delete"], url_path=r"schedules/(?P<schedule_id>[^/.]+)")
    def schedule_detail(self, request, pk=None, schedule_id=None):
        doctor = self.get_object()
        schedule = DoctorSchedule.objects.filter(doctor=doctor, id=schedule_id).first()
        if not schedule:
            return Response({"detail": "Horario no encontrado."}, status=status.HTTP_404_NOT_FOUND)
        role = get_role_name(request.user)
        if request.method in ["PATCH", "DELETE"] and role not in ["superadmin", "admin"]:
            return Response({"detail": "No tienes permiso para administrar horarios."}, status=status.HTTP_403_FORBIDDEN)
        if role == "admin" and doctor.clinic_id != request.user.clinica_id:
            return Response({"detail": "No tienes permiso para administrar este medico."}, status=status.HTTP_403_FORBIDDEN)
        if request.method == "GET":
            return Response(DoctorScheduleSerializer(schedule).data)
        if request.method == "DELETE":
            schedule.activo = False
            schedule.save(update_fields=["activo"])
            return Response(status=status.HTTP_204_NO_CONTENT)
        serializer = DoctorScheduleSerializer(schedule, data=request.data, partial=True, context={"doctor": doctor})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class DoctorDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if get_role_name(request.user) != "medico":
            return Response({"detail": "Solo disponible para medicos."}, status=status.HTTP_403_FORBIDDEN)
        doctor = DoctorProfile.objects.filter(user=request.user).select_related("user", "specialty").first()
        if not doctor:
            return Response({"doctor": None, "schedules": []})
        schedules = DoctorScheduleSerializer(doctor.schedules.filter(activo=True), many=True).data
        return Response(
            {
                "doctor": {
                    "id": doctor.id,
                    "nombre_completo": doctor.user.nombre_completo,
                    "email": doctor.user.email,
                    "specialty": doctor.specialty.nombre,
                    "numero_colegiacion": doctor.numero_colegiacion,
                    "activo": doctor.activo,
                },
                "schedules": schedules,
            }
        )

