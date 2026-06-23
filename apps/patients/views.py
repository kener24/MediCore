from datetime import date

from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import get_role_name
from apps.patients.models import Patient
from apps.patients.serializers import (
    PatientCreateSerializer,
    PatientDetailSerializer,
    PatientListSerializer,
    PatientMeSerializer,
    PatientStatsSerializer,
    PatientUpdateSerializer,
)
from apps.audit.models import AuditLog
from apps.audit.services import log_audit_event


CLINIC_VIEW_ROLES = ["superadmin", "admin", "medico", "enfermera", "recepcionista"]
PATIENT_WRITE_ROLES = ["admin", "enfermera", "recepcionista"]
PATIENT_DEACTIVATE_ROLES = ["admin"]


def normalized_role(user):
    return str(get_role_name(user) or "").lower()


class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.select_related("clinic", "user")
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "list":
            return PatientListSerializer
        if self.action == "create":
            return PatientCreateSerializer
        if self.action in ["update", "partial_update"]:
            return PatientUpdateSerializer
        return PatientDetailSerializer

    def get_queryset(self):
        user = self.request.user
        role = normalized_role(user)
        queryset = super().get_queryset()
        if role == "superadmin" or user.is_superuser:
            pass
        elif role in ["admin", "medico", "enfermera", "recepcionista"] and user.clinica_id:
            queryset = queryset.filter(clinic_id=user.clinica_id)
        elif role in ["paciente", "patient"]:
            queryset = queryset.filter(user=user)
        else:
            queryset = queryset.none()

        search = self.request.query_params.get("search")
        is_active = self.request.query_params.get("is_active")
        gender = self.request.query_params.get("gender")
        blood_type = self.request.query_params.get("blood_type")
        age_min = self.request.query_params.get("age_min")
        age_max = self.request.query_params.get("age_max")
        ordering = self.request.query_params.get("ordering")

        if search:
            queryset = queryset.filter(
                Q(nombre_completo__icontains=search)
                | Q(identidad__icontains=search)
                | Q(telefono__icontains=search)
                | Q(correo__icontains=search)
                | Q(codigo_paciente__icontains=search)
            )
        if is_active is not None:
            queryset = queryset.filter(activo=is_active.lower() in ["1", "true", "yes", "si"])
        if gender:
            queryset = queryset.filter(genero=gender)
        if blood_type:
            queryset = queryset.filter(tipo_sangre=blood_type)
        today = date.today()
        if age_min:
            queryset = queryset.filter(fecha_nacimiento__lte=date(today.year - int(age_min), today.month, today.day))
        if age_max:
            queryset = queryset.filter(fecha_nacimiento__gte=date(today.year - int(age_max), today.month, today.day))
        if ordering in ["creado_en", "-creado_en", "nombre_completo", "-nombre_completo", "fecha_nacimiento", "-fecha_nacimiento"]:
            queryset = queryset.order_by(ordering)
        return queryset

    def list(self, request, *args, **kwargs):
        role = normalized_role(request.user)
        if role in ["paciente", "patient"]:
            return Response({"detail": "No tienes permiso para listar pacientes."}, status=status.HTTP_403_FORBIDDEN)
        if role not in CLINIC_VIEW_ROLES and not request.user.is_superuser:
            return Response({"detail": "No tienes permiso para ver pacientes."}, status=status.HTTP_403_FORBIDDEN)
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        if normalized_role(request.user) not in PATIENT_WRITE_ROLES:
            return Response({"detail": "No tienes permiso para crear pacientes."}, status=status.HTTP_403_FORBIDDEN)
        response = super().create(request, *args, **kwargs)
        if response.status_code == status.HTTP_201_CREATED:
            log_audit_event(request=request, action=AuditLog.Action.CREATE, module=AuditLog.Module.PATIENTS, model_name="Patient", object_id=response.data.get("id"), object_repr=response.data.get("nombre_completo", ""), description="Paciente creado.", new_values=request.data)
        return response

    def update(self, request, *args, **kwargs):
        if normalized_role(request.user) not in PATIENT_WRITE_ROLES:
            return Response({"detail": "No tienes permiso para actualizar pacientes."}, status=status.HTTP_403_FORBIDDEN)
        patient = self.get_object()
        old_values = {"nombre_completo": patient.nombre_completo, "telefono": patient.telefono, "correo": patient.correo, "activo": patient.activo}
        response = super().update(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            log_audit_event(request=request, clinic=patient.clinic, action=AuditLog.Action.UPDATE, module=AuditLog.Module.PATIENTS, model_name="Patient", object_id=patient.id, object_repr=patient.nombre_completo, description="Paciente actualizado.", old_values=old_values, new_values=request.data)
        return response

    def destroy(self, request, *args, **kwargs):
        if normalized_role(request.user) not in PATIENT_DEACTIVATE_ROLES:
            return Response({"detail": "No tienes permiso para desactivar pacientes."}, status=status.HTTP_403_FORBIDDEN)
        patient = self.get_object()
        patient.activo = False
        patient.save(update_fields=["activo"])
        log_audit_event(request=request, clinic=patient.clinic, action=AuditLog.Action.DEACTIVATE, module=AuditLog.Module.PATIENTS, model_name="Patient", object_id=patient.id, object_repr=patient.nombre_completo, description="Paciente desactivado.")
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["get"])
    def me(self, request):
        if normalized_role(request.user) not in ["paciente", "patient"]:
            return Response({"detail": "Solo disponible para pacientes."}, status=status.HTTP_403_FORBIDDEN)
        patient = Patient.objects.filter(user=request.user).select_related("clinic", "user").first()
        if not patient:
            return Response({"detail": "No tienes un perfil de paciente vinculado."}, status=status.HTTP_404_NOT_FOUND)
        return Response(PatientMeSerializer(patient).data)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        queryset = self.get_queryset()
        if normalized_role(request.user) in ["paciente", "patient"]:
            return Response({"detail": "No tienes permiso para ver estadísticas."}, status=status.HTTP_403_FORBIDDEN)
        total = queryset.count()
        active = queryset.filter(activo=True).count()
        data = {
            "total_patients": total,
            "active_patients": active,
            "inactive_patients": total - active,
            "male_patients": queryset.filter(genero="masculino").count(),
            "female_patients": queryset.filter(genero="femenino").count(),
            "other_patients": queryset.filter(genero__in=["otro", "no_especificado"]).count(),
        }
        return Response(PatientStatsSerializer(data).data)

    @action(detail=True, methods=["patch"])
    def activate(self, request, pk=None):
        if normalized_role(request.user) not in PATIENT_DEACTIVATE_ROLES:
            return Response({"detail": "No tienes permiso para activar pacientes."}, status=status.HTTP_403_FORBIDDEN)
        patient = self.get_object()
        patient.activo = True
        patient.save(update_fields=["activo"])
        log_audit_event(request=request, clinic=patient.clinic, action=AuditLog.Action.ACTIVATE, module=AuditLog.Module.PATIENTS, model_name="Patient", object_id=patient.id, object_repr=patient.nombre_completo, description="Paciente activado.")
        return Response(PatientDetailSerializer(patient).data)

    @action(detail=True, methods=["patch"])
    def deactivate(self, request, pk=None):
        if normalized_role(request.user) not in PATIENT_DEACTIVATE_ROLES:
            return Response({"detail": "No tienes permiso para desactivar pacientes."}, status=status.HTTP_403_FORBIDDEN)
        patient = self.get_object()
        patient.activo = False
        patient.save(update_fields=["activo"])
        log_audit_event(request=request, clinic=patient.clinic, action=AuditLog.Action.DEACTIVATE, module=AuditLog.Module.PATIENTS, model_name="Patient", object_id=patient.id, object_repr=patient.nombre_completo, description="Paciente desactivado.")
        return Response(PatientDetailSerializer(patient).data)

    @action(detail=True, methods=["get"], url_path="medical-record")
    def medical_record(self, request, pk=None):
        from apps.medical_records.views import patient_medical_record_response

        return patient_medical_record_response(request, self.get_object())

    @action(detail=True, methods=["get"], url_path="clinical-history")
    def clinical_history(self, request, pk=None):
        from apps.medical_records.views import patient_clinical_history_response

        return patient_clinical_history_response(request, self.get_object())
