from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import get_role_name
from apps.admissions.models import PatientVisit
from apps.admissions.serializers import (
    AppointmentCheckInSerializer,
    PatientVisitCreateSerializer,
    PatientVisitSerializer,
    VisitVitalSignsSerializer,
    WalkInRegistrationSerializer,
)
from apps.appointments.models import Appointment
from apps.audit.models import AuditLog
from apps.audit.services import log_audit_event
from apps.billing.models import Invoice, InvoiceItem
from apps.billing.serializers import InvoiceDetailSerializer
from apps.medical_records.models import ClinicalConsultation, MedicalRecord, VitalSigns
from apps.medical_records.serializers import VitalSignsSerializer
from apps.notifications.models import Notification
from apps.notifications.services import notify_role_users


VIEW_ROLES = ["superadmin", "admin", "recepcionista", "enfermera", "medico"]
RECEPTION_ROLES = ["superadmin", "admin", "recepcionista"]
TRIAGE_ROLES = ["superadmin", "admin", "enfermera"]
DOCTOR_ROLES = ["superadmin", "admin", "medico"]
BILLING_ROLES = ["superadmin", "admin", "recepcionista"]


def scope(request, queryset):
    role = get_role_name(request.user)
    if role == "superadmin" or request.user.is_superuser:
        clinic = request.query_params.get("clinic")
        return queryset.filter(clinic_id=clinic) if clinic else queryset
    if role in VIEW_ROLES and request.user.clinica_id:
        queryset = queryset.filter(clinic_id=request.user.clinica_id)
        if role == "medico":
            queryset = queryset.filter(Q(assigned_doctor__user=request.user) | Q(assigned_doctor__isnull=True))
        return queryset
    return queryset.none()


class PatientVisitViewSet(viewsets.ModelViewSet):
    queryset = PatientVisit.objects.select_related(
        "clinic",
        "patient",
        "appointment",
        "medical_record",
        "consultation",
        "invoice",
        "assigned_doctor__user",
        "assigned_nurse",
        "created_by",
        "checked_in_by",
    ).prefetch_related("vital_signs")
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "create":
            return PatientVisitCreateSerializer
        return PatientVisitSerializer

    def get_queryset(self):
        queryset = scope(self.request, super().get_queryset())
        p = self.request.query_params
        for param, field in [("patient", "patient_id"), ("doctor", "assigned_doctor_id"), ("nurse", "assigned_nurse_id"), ("status", "status"), ("priority", "priority"), ("visit_type", "visit_type")]:
            if p.get(param):
                queryset = queryset.filter(**{field: p[param]})
        if p.get("date_from"):
            queryset = queryset.filter(visit_date__gte=p["date_from"])
        if p.get("date_to"):
            queryset = queryset.filter(visit_date__lte=p["date_to"])
        if p.get("today", "").lower() in ["1", "true", "yes", "si"]:
            queryset = queryset.filter(visit_date=timezone.localdate())
        if p.get("search"):
            search = p["search"]
            queryset = queryset.filter(Q(patient__nombre_completo__icontains=search) | Q(patient__identidad__icontains=search) | Q(patient__codigo_paciente__icontains=search) | Q(reason__icontains=search))
        return queryset

    def create(self, request, *args, **kwargs):
        if get_role_name(request.user) not in RECEPTION_ROLES + ["enfermera"]:
            return Response({"detail": "No tienes permiso para crear atenciones."}, status=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        visit = serializer.save()
        log_audit_event(request=request, clinic=visit.clinic, action=AuditLog.Action.CREATE, module=AuditLog.Module.APPOINTMENTS, model_name="PatientVisit", object_id=visit.id, object_repr=visit.visit_number, description="Atencion registrada.", new_values={"patient": visit.patient_id, "status": visit.status})
        notify_role_users(visit.clinic, ["enfermera"], "Paciente esperando triaje", f"{visit.patient.nombre_completo} espera evaluacion inicial.", module=Notification.Module.APPOINTMENTS, priority=Notification.Priority.NORMAL, notification_type=Notification.Type.INFO, related_model="PatientVisit", related_object_id=visit.id, action_url="/clinic/triage")
        return Response(PatientVisitSerializer(visit).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="register-walk-in")
    def register_walk_in(self, request):
        serializer = WalkInRegistrationSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        visit = serializer.save()
        log_audit_event(request=request, clinic=visit.clinic, action=AuditLog.Action.CREATE, module=AuditLog.Module.APPOINTMENTS, model_name="PatientVisit", object_id=visit.id, object_repr=visit.visit_number, description="Atencion sin cita registrada.", new_values={"patient": visit.patient_id})
        return Response(PatientVisitSerializer(visit).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="check-in-appointment")
    def check_in_appointment(self, request):
        serializer = AppointmentCheckInSerializer(data=request.data, context={"request": request})
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

    @action(detail=False, methods=["get"], url_path="triage-queue")
    def triage_queue(self, request):
        queryset = self.get_queryset().filter(status__in=[PatientVisit.Status.WAITING_TRIAGE, PatientVisit.Status.IN_TRIAGE])
        return Response(PatientVisitSerializer(queryset, many=True).data)

    @action(detail=True, methods=["patch"], url_path="start-triage")
    def start_triage(self, request, pk=None):
        if get_role_name(request.user) not in TRIAGE_ROLES:
            return Response({"detail": "No tienes permiso para iniciar triaje."}, status=status.HTTP_403_FORBIDDEN)
        visit = self.get_object()
        if visit.status not in [PatientVisit.Status.REGISTERED, PatientVisit.Status.WAITING_TRIAGE]:
            return Response({"detail": "La visita no esta esperando triaje."}, status=status.HTTP_400_BAD_REQUEST)
        visit.touch_status(PatientVisit.Status.IN_TRIAGE, user=request.user)
        log_audit_event(request=request, clinic=visit.clinic, action=AuditLog.Action.UPDATE, module=AuditLog.Module.APPOINTMENTS, model_name="PatientVisit", object_id=visit.id, object_repr=visit.visit_number, description="Triaje iniciado.")
        return Response(PatientVisitSerializer(visit).data)

    @action(detail=True, methods=["patch"], url_path="complete-triage")
    def complete_triage(self, request, pk=None):
        if get_role_name(request.user) not in TRIAGE_ROLES:
            return Response({"detail": "No tienes permiso para finalizar triaje."}, status=status.HTTP_403_FORBIDDEN)
        visit = self.get_object()
        if not visit.vital_signs.exists():
            return Response({"detail": "Registra signos vitales antes de finalizar triaje."}, status=status.HTTP_400_BAD_REQUEST)
        visit.touch_status(PatientVisit.Status.WAITING_DOCTOR, user=request.user)
        notify_role_users(visit.clinic, ["medico"], "Paciente esperando consulta", f"{visit.patient.nombre_completo} esta listo para consulta.", module=Notification.Module.APPOINTMENTS, priority=Notification.Priority.NORMAL, notification_type=Notification.Type.INFO, related_model="PatientVisit", related_object_id=visit.id, action_url="/doctor/waiting-room")
        log_audit_event(request=request, clinic=visit.clinic, action=AuditLog.Action.FINALIZE, module=AuditLog.Module.APPOINTMENTS, model_name="PatientVisit", object_id=visit.id, object_repr=visit.visit_number, description="Triaje finalizado.")
        return Response(PatientVisitSerializer(visit).data)

    @action(detail=True, methods=["get", "post"], url_path="vital-signs")
    def vital_signs(self, request, pk=None):
        visit = self.get_object()
        if request.method == "GET":
            signs = visit.vital_signs.order_by("-creado_en")
            return Response(VitalSignsSerializer(signs, many=True).data)
        if get_role_name(request.user) not in TRIAGE_ROLES + ["medico"]:
            return Response({"detail": "No tienes permiso para registrar signos vitales."}, status=status.HTTP_403_FORBIDDEN)
        serializer = VisitVitalSignsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            signs = serializer.save(patient_visit=visit, registrado_por=request.user)
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        log_audit_event(request=request, clinic=visit.clinic, action=AuditLog.Action.CREATE, module=AuditLog.Module.MEDICAL_RECORDS, model_name="VitalSigns", object_id=signs.id, object_repr=visit.visit_number, description="Signos vitales registrados.")
        return Response(VitalSignsSerializer(signs).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path="doctor-waiting-room")
    def doctor_waiting_room(self, request):
        queryset = self.get_queryset().filter(status__in=[PatientVisit.Status.WAITING_DOCTOR, PatientVisit.Status.IN_CONSULTATION])
        return Response(PatientVisitSerializer(queryset, many=True).data)

    @action(detail=True, methods=["patch"], url_path="start-consultation")
    def start_consultation(self, request, pk=None):
        if get_role_name(request.user) not in DOCTOR_ROLES:
            return Response({"detail": "No tienes permiso para iniciar consulta."}, status=status.HTTP_403_FORBIDDEN)
        visit = self.get_object()
        if visit.status not in [PatientVisit.Status.WAITING_DOCTOR, PatientVisit.Status.IN_CONSULTATION]:
            return Response({"detail": "La visita no esta esperando doctor."}, status=status.HTTP_400_BAD_REQUEST)
        if get_role_name(request.user) == "medico" and visit.assigned_doctor_id and visit.assigned_doctor.user_id != request.user.id:
            return Response({"detail": "Esta visita esta asignada a otro medico."}, status=status.HTTP_403_FORBIDDEN)
        doctor = visit.assigned_doctor or getattr(request.user, "doctor_profile", None)
        if not doctor:
            return Response({"detail": "No hay medico asignado."}, status=status.HTTP_400_BAD_REQUEST)
        consultation = visit.consultation
        if not consultation:
            consultation = ClinicalConsultation.objects.create(
                clinic=visit.clinic,
                medical_record=visit.medical_record,
                patient=visit.patient,
                doctor=doctor,
                appointment=visit.appointment,
                patient_visit=visit,
                consultation_date=visit.visit_date,
                chief_complaint=visit.reason,
                symptoms=visit.symptoms,
                created_by=request.user,
            )
            visit.consultation = consultation
        visit.assigned_doctor = doctor
        visit.touch_status(PatientVisit.Status.IN_CONSULTATION, user=request.user)
        visit.save(update_fields=["assigned_doctor", "consultation", "status", "consultation_started_at", "actualizado_en"])
        log_audit_event(request=request, clinic=visit.clinic, action=AuditLog.Action.CREATE, module=AuditLog.Module.CONSULTATIONS, model_name="ClinicalConsultation", object_id=consultation.id, object_repr=str(consultation), description="Consulta iniciada desde visita.")
        return Response({"visit": PatientVisitSerializer(visit).data, "consultation": consultation.id})

    @action(detail=True, methods=["patch"], url_path="complete-consultation")
    def complete_consultation(self, request, pk=None):
        visit = self.get_object()
        if not visit.consultation_id:
            return Response({"detail": "La visita no tiene consulta iniciada."}, status=status.HTTP_400_BAD_REQUEST)
        if visit.consultation.status != ClinicalConsultation.Status.FINALIZADA:
            return Response({"detail": "La consulta debe estar finalizada antes de pasar a caja."}, status=status.HTTP_400_BAD_REQUEST)
        visit.touch_status(PatientVisit.Status.WAITING_BILLING, user=request.user)
        notify_role_users(visit.clinic, ["recepcionista", "admin"], "Paciente pendiente de cobro", f"{visit.patient.nombre_completo} esta listo para facturacion.", module=Notification.Module.BILLING, priority=Notification.Priority.NORMAL, notification_type=Notification.Type.INFO, related_model="PatientVisit", related_object_id=visit.id, action_url="/clinic/billing/pending")
        return Response(PatientVisitSerializer(visit).data)

    @action(detail=False, methods=["get"], url_path="stats-today")
    def stats_today(self, request):
        visits = self.get_queryset().filter(visit_date=timezone.localdate())
        data = {
            "registered_today": visits.count(),
            "waiting_triage": visits.filter(status=PatientVisit.Status.WAITING_TRIAGE).count(),
            "in_triage": visits.filter(status=PatientVisit.Status.IN_TRIAGE).count(),
            "waiting_doctor": visits.filter(status=PatientVisit.Status.WAITING_DOCTOR).count(),
            "in_consultation": visits.filter(status=PatientVisit.Status.IN_CONSULTATION).count(),
            "waiting_billing": visits.filter(status=PatientVisit.Status.WAITING_BILLING).count(),
            "completed": visits.filter(status=PatientVisit.Status.COMPLETED).count(),
            "cancelled": visits.filter(status=PatientVisit.Status.CANCELLED).count(),
        }
        return Response(data)

    @action(detail=False, methods=["get"], url_path="pending-billing")
    def pending_billing(self, request):
        queryset = self.get_queryset().filter(status=PatientVisit.Status.WAITING_BILLING)
        return Response(PatientVisitSerializer(queryset, many=True).data)

    @action(detail=True, methods=["post"], url_path="generate-invoice")
    def generate_invoice(self, request, pk=None):
        if get_role_name(request.user) not in BILLING_ROLES:
            return Response({"detail": "No tienes permiso para generar factura desde visita."}, status=status.HTTP_403_FORBIDDEN)
        visit = self.get_object()
        if visit.invoice_id:
            return Response({"detail": "Esta visita ya tiene factura generada."}, status=status.HTTP_400_BAD_REQUEST)
        if visit.status != PatientVisit.Status.WAITING_BILLING:
            return Response({"detail": "La visita debe estar pendiente de cobro."}, status=status.HTTP_400_BAD_REQUEST)
        invoice = Invoice.objects.create(clinic=visit.clinic, patient=visit.patient, appointment=visit.appointment, consultation=visit.consultation, created_by=request.user, notes=f"Factura generada desde visita {visit.visit_number}")
        for consumption in visit.patient.clinical_supply_usages.filter(clinic=visit.clinic, billable=True, invoiced=False, active=True).exclude(status="cancelled"):
            if visit.consultation_id and consumption.consultation_id and consumption.consultation_id != visit.consultation_id:
                continue
            item = InvoiceItem.objects.create(invoice=invoice, related_consumption=consumption, description=consumption.description, quantity=consumption.quantity, unit_price=consumption.unit_price)
            consumption.invoiced = True
            consumption.invoice = invoice
            consumption.invoice_item = item
            consumption.status = "invoiced"
            consumption.save(update_fields=["invoiced", "invoice", "invoice_item", "status", "actualizado_en"])
        if not invoice.items.filter(active=True).exists():
            InvoiceItem.objects.create(invoice=invoice, item_type=InvoiceItem.Type.MANUAL, description=visit.reason or "Atencion medica", quantity=1, unit_price=Decimal("0.00"))
        visit.invoice = invoice
        visit.save(update_fields=["invoice", "actualizado_en"])
        log_audit_event(request=request, clinic=visit.clinic, action=AuditLog.Action.CREATE, module=AuditLog.Module.BILLING, model_name="Invoice", object_id=invoice.id, object_repr=invoice.invoice_number, description="Factura generada desde visita.", new_values={"visit": visit.id})
        return Response(InvoiceDetailSerializer(invoice).data, status=status.HTTP_201_CREATED)
