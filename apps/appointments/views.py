from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import get_role_name
from apps.appointments.models import Appointment
from apps.appointments.serializers import (
    AppointmentCancelSerializer,
    AppointmentCreateSerializer,
    AppointmentDetailSerializer,
    AppointmentListSerializer,
    AppointmentRescheduleSerializer,
    AppointmentStatsSerializer,
    AppointmentUpdateSerializer,
    build_availability,
)
from apps.doctors.models import DoctorProfile
from apps.patients.models import Patient
from apps.audit.models import AuditLog
from apps.audit.services import log_audit_event
from apps.notifications.models import Notification
from apps.notifications.services import create_notification, notify_role_users


CLINIC_ROLES = ["superadmin", "admin", "enfermera", "recepcionista"]


class AppointmentViewSet(viewsets.ModelViewSet):
    queryset = Appointment.objects.select_related("clinic", "patient", "doctor__user", "doctor__specialty", "created_by", "cancelled_by")
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "list":
            return AppointmentListSerializer
        if self.action == "create":
            return AppointmentCreateSerializer
        if self.action in ["update", "partial_update"]:
            return AppointmentUpdateSerializer
        return AppointmentDetailSerializer

    def get_queryset(self):
        user = self.request.user
        role = get_role_name(user)
        queryset = super().get_queryset()
        if role == "superadmin" or user.is_superuser:
            clinic = self.request.query_params.get("clinic")
            if clinic:
                queryset = queryset.filter(clinic_id=clinic)
        elif role in ["admin", "enfermera", "recepcionista"] and user.clinica_id:
            queryset = queryset.filter(clinic_id=user.clinica_id)
        elif role == "medico":
            queryset = queryset.filter(doctor__user=user)
        elif role == "paciente":
            queryset = queryset.filter(patient__user=user)
        else:
            queryset = queryset.none()

        params = self.request.query_params
        if params.get("date"):
            queryset = queryset.filter(scheduled_date=params["date"])
        if params.get("date_from"):
            queryset = queryset.filter(scheduled_date__gte=params["date_from"])
        if params.get("date_to"):
            queryset = queryset.filter(scheduled_date__lte=params["date_to"])
        if params.get("doctor"):
            queryset = queryset.filter(doctor_id=params["doctor"])
        if params.get("patient"):
            queryset = queryset.filter(patient_id=params["patient"])
        if params.get("status"):
            queryset = queryset.filter(status=params["status"])
        if params.get("is_active") is not None:
            queryset = queryset.filter(activo=params["is_active"].lower() in ["1", "true", "yes", "si"])
        if params.get("search"):
            search = params["search"]
            queryset = queryset.filter(Q(patient__nombre_completo__icontains=search) | Q(doctor__user__nombre_completo__icontains=search) | Q(reason__icontains=search))
        ordering = params.get("ordering")
        if ordering in ["scheduled_date", "-scheduled_date", "start_time", "-start_time", "status", "-status", "creado_en", "-creado_en"]:
            queryset = queryset.order_by(ordering)
        return queryset

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        if response.status_code == status.HTTP_201_CREATED:
            appointment = Appointment.objects.select_related("clinic", "doctor__user", "patient__user").filter(id=response.data.get("id")).first()
            if appointment:
                log_audit_event(request=request, clinic=appointment.clinic, action=AuditLog.Action.CREATE, module=AuditLog.Module.APPOINTMENTS, model_name="Appointment", object_id=appointment.id, object_repr=str(appointment), description="Cita creada.", new_values=request.data)
                message = f"Cita programada el {appointment.scheduled_date} a las {appointment.start_time}."
                for user in [appointment.doctor.user, appointment.patient.user]:
                    if user:
                        create_notification(user, "Nueva cita", message, clinic=appointment.clinic, notification_type=Notification.Type.REMINDER, module=Notification.Module.APPOINTMENTS, priority=Notification.Priority.NORMAL, related_model="Appointment", related_object_id=appointment.id, action_url=f"/clinic/appointments/{appointment.id}")
        return response

    def destroy(self, request, *args, **kwargs):
        appointment = self.get_object()
        response = self._cancel(request, appointment, "Cancelada desde DELETE.")
        return Response(status=status.HTTP_204_NO_CONTENT) if response.status_code == status.HTTP_200_OK else response

    def _cancel(self, request, appointment, reason=""):
        if appointment.status == Appointment.Status.ATENDIDA:
            return Response({"detail": "No puedes cancelar una cita atendida."}, status=status.HTTP_400_BAD_REQUEST)
        appointment.status = Appointment.Status.CANCELADA
        appointment.activo = False
        appointment.cancellation_reason = reason
        appointment.cancelled_by = request.user
        appointment.cancelled_at = timezone.now()
        appointment.save(update_fields=["status", "activo", "cancellation_reason", "cancelled_by", "cancelled_at"])
        log_audit_event(request=request, clinic=appointment.clinic, action=AuditLog.Action.CANCEL, module=AuditLog.Module.APPOINTMENTS, model_name="Appointment", object_id=appointment.id, object_repr=str(appointment), description="Cita cancelada.", new_values={"reason": reason})
        message = f"Cita cancelada: {appointment.scheduled_date} {appointment.start_time}."
        for user in [appointment.doctor.user, appointment.patient.user]:
            if user:
                create_notification(user, "Cita cancelada", message, clinic=appointment.clinic, notification_type=Notification.Type.WARNING, module=Notification.Module.APPOINTMENTS, priority=Notification.Priority.HIGH, related_model="Appointment", related_object_id=appointment.id, action_url=f"/clinic/appointments/{appointment.id}")
        notify_role_users(appointment.clinic, ["admin", "recepcionista"], "Cita cancelada", message, module=Notification.Module.APPOINTMENTS, priority=Notification.Priority.NORMAL, notification_type=Notification.Type.WARNING, related_model="Appointment", related_object_id=appointment.id, action_url=f"/clinic/appointments/{appointment.id}")
        return Response(AppointmentDetailSerializer(appointment).data)

    @action(detail=True, methods=["patch"])
    def confirm(self, request, pk=None):
        appointment = self.get_object()
        if appointment.status == Appointment.Status.CANCELADA:
            return Response({"detail": "No puedes confirmar una cita cancelada."}, status=status.HTTP_400_BAD_REQUEST)
        appointment.status = Appointment.Status.CONFIRMADA
        appointment.confirmed_at = timezone.now()
        appointment.save(update_fields=["status", "confirmed_at"])
        log_audit_event(request=request, clinic=appointment.clinic, action=AuditLog.Action.UPDATE, module=AuditLog.Module.APPOINTMENTS, model_name="Appointment", object_id=appointment.id, object_repr=str(appointment), description="Cita confirmada.")
        message = f"Cita confirmada el {appointment.scheduled_date} a las {appointment.start_time}."
        for user in [appointment.doctor.user, appointment.patient.user]:
            if user:
                create_notification(user, "Cita confirmada", message, clinic=appointment.clinic, notification_type=Notification.Type.SUCCESS, module=Notification.Module.APPOINTMENTS, priority=Notification.Priority.NORMAL, related_model="Appointment", related_object_id=appointment.id, action_url=f"/clinic/appointments/{appointment.id}")
        return Response(AppointmentDetailSerializer(appointment).data)

    @action(detail=True, methods=["patch"])
    def cancel(self, request, pk=None):
        appointment = self.get_object()
        serializer = AppointmentCancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return self._cancel(request, appointment, serializer.validated_data.get("cancellation_reason", ""))

    @action(detail=True, methods=["patch"], url_path="mark-attended")
    def mark_attended(self, request, pk=None):
        appointment = self.get_object()
        if appointment.status == Appointment.Status.CANCELADA:
            return Response({"detail": "No puedes atender una cita cancelada."}, status=status.HTTP_400_BAD_REQUEST)
        appointment.status = Appointment.Status.ATENDIDA
        appointment.attended_at = timezone.now()
        appointment.save(update_fields=["status", "attended_at"])
        log_audit_event(request=request, clinic=appointment.clinic, action=AuditLog.Action.FINALIZE, module=AuditLog.Module.APPOINTMENTS, model_name="Appointment", object_id=appointment.id, object_repr=str(appointment), description="Cita marcada como atendida.")
        return Response(AppointmentDetailSerializer(appointment).data)

    @action(detail=True, methods=["patch"], url_path="mark-no-show")
    def mark_no_show(self, request, pk=None):
        appointment = self.get_object()
        if appointment.status == Appointment.Status.CANCELADA:
            return Response({"detail": "No puedes marcar no asistio una cita cancelada."}, status=status.HTTP_400_BAD_REQUEST)
        appointment.status = Appointment.Status.NO_ASISTIO
        appointment.save(update_fields=["status"])
        log_audit_event(request=request, clinic=appointment.clinic, action=AuditLog.Action.UPDATE, module=AuditLog.Module.APPOINTMENTS, model_name="Appointment", object_id=appointment.id, object_repr=str(appointment), description="Cita marcada como no asistio.")
        return Response(AppointmentDetailSerializer(appointment).data)

    @action(detail=True, methods=["post"], url_path="start-consultation")
    def start_consultation(self, request, pk=None):
        from apps.medical_records.views import start_consultation_from_appointment

        return start_consultation_from_appointment(request, self.get_object())

    @action(detail=True, methods=["patch"], url_path="check-in")
    def check_in(self, request, pk=None):
        from apps.admissions.models import PatientVisit
        from apps.admissions.serializers import AppointmentCheckInSerializer, PatientVisitSerializer
        from apps.medical_records.models import MedicalRecord

        data = {**request.data, "appointment": self.get_object().id}
        serializer = AppointmentCheckInSerializer(data=data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        appointment = serializer.validated_data["appointment"]
        visit = PatientVisit.objects.create(
            clinic=appointment.clinic,
            patient=appointment.patient,
            appointment=appointment,
            medical_record=MedicalRecord.objects.get_or_create(patient=appointment.patient, defaults={"clinic": appointment.clinic})[0],
            visit_type=PatientVisit.VisitType.APPOINTMENT,
            priority=serializer.validated_data["priority"],
            reason=appointment.reason,
            symptoms=serializer.validated_data.get("symptoms", ""),
            assigned_doctor=appointment.doctor,
            created_by=request.user,
            checked_in_by=request.user,
            status=PatientVisit.Status.WAITING_TRIAGE,
        )
        appointment.status = Appointment.Status.CONFIRMADA
        appointment.confirmed_at = appointment.confirmed_at or timezone.now()
        appointment.save(update_fields=["status", "confirmed_at"])
        log_audit_event(request=request, clinic=visit.clinic, action=AuditLog.Action.CREATE, module=AuditLog.Module.APPOINTMENTS, model_name="PatientVisit", object_id=visit.id, object_repr=visit.visit_number, description="Check-in de cita registrado.", new_values={"appointment": appointment.id})
        return Response(PatientVisitSerializer(visit).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["patch"])
    def reschedule(self, request, pk=None):
        appointment = self.get_object()
        old_values = {"scheduled_date": appointment.scheduled_date, "start_time": appointment.start_time, "end_time": appointment.end_time, "doctor": appointment.doctor_id, "status": appointment.status}
        if appointment.status == Appointment.Status.ATENDIDA:
            return Response({"detail": "No puedes reprogramar una cita atendida."}, status=status.HTTP_400_BAD_REQUEST)
        serializer = AppointmentRescheduleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        update = AppointmentUpdateSerializer(appointment, data={**serializer.validated_data, "status": Appointment.Status.REPROGRAMADA}, partial=True, context={"request": request})
        update.is_valid(raise_exception=True)
        update.save(status=Appointment.Status.REPROGRAMADA)
        appointment.refresh_from_db()
        log_audit_event(request=request, clinic=appointment.clinic, action=AuditLog.Action.UPDATE, module=AuditLog.Module.APPOINTMENTS, model_name="Appointment", object_id=appointment.id, object_repr=str(appointment), description="Cita reprogramada.", old_values=old_values, new_values={"scheduled_date": appointment.scheduled_date, "start_time": appointment.start_time, "end_time": appointment.end_time, "doctor": appointment.doctor_id, "status": appointment.status})
        message = f"Cita reprogramada para {appointment.scheduled_date} a las {appointment.start_time}."
        for user in [appointment.doctor.user, appointment.patient.user]:
            if user:
                create_notification(user, "Cita reprogramada", message, clinic=appointment.clinic, notification_type=Notification.Type.REMINDER, module=Notification.Module.APPOINTMENTS, priority=Notification.Priority.HIGH, related_model="Appointment", related_object_id=appointment.id, action_url=f"/clinic/appointments/{appointment.id}")
        return Response(AppointmentDetailSerializer(appointment).data)

    @action(detail=False, methods=["get"])
    def availability(self, request):
        doctor_id = request.query_params.get("doctor")
        date_value = request.query_params.get("date")
        if not doctor_id or not date_value:
            return Response({"detail": "doctor y date son obligatorios."}, status=status.HTTP_400_BAD_REQUEST)
        doctor = DoctorProfile.objects.filter(id=doctor_id).first()
        if not doctor:
            return Response({"detail": "Medico no encontrado."}, status=status.HTTP_404_NOT_FOUND)
        target_date = timezone.datetime.fromisoformat(date_value).date()
        if get_role_name(request.user) in ["admin", "enfermera", "recepcionista"] and doctor.clinic_id != request.user.clinica_id:
            return Response({"detail": "No tienes permiso para consultar esta disponibilidad."}, status=status.HTTP_403_FORBIDDEN)
        return Response(build_availability(doctor, target_date))

    @action(detail=False, methods=["get"], url_path="my-appointments")
    def my_appointments(self, request):
        if get_role_name(request.user) != "medico":
            return Response({"detail": "Solo disponible para medicos."}, status=status.HTTP_403_FORBIDDEN)
        serializer = AppointmentListSerializer(self.get_queryset(), many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="my-patient-appointments")
    def my_patient_appointments(self, request):
        if get_role_name(request.user) != "paciente":
            return Response({"detail": "Solo disponible para pacientes."}, status=status.HTTP_403_FORBIDDEN)
        serializer = AppointmentListSerializer(self.get_queryset(), many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        queryset = self.get_queryset()
        today = timezone.localdate()
        data = {
            "total_appointments": queryset.count(),
            "pending": queryset.filter(status=Appointment.Status.PENDIENTE).count(),
            "confirmed": queryset.filter(status=Appointment.Status.CONFIRMADA).count(),
            "cancelled": queryset.filter(status=Appointment.Status.CANCELADA).count(),
            "attended": queryset.filter(status=Appointment.Status.ATENDIDA).count(),
            "no_show": queryset.filter(status=Appointment.Status.NO_ASISTIO).count(),
            "today": queryset.filter(scheduled_date=today).count(),
            "upcoming": queryset.filter(scheduled_date__gt=today, status__in=[Appointment.Status.PENDIENTE, Appointment.Status.CONFIRMADA]).count(),
        }
        return Response(AppointmentStatsSerializer(data).data)
