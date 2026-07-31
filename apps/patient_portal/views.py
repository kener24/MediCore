from datetime import datetime, timedelta
from io import BytesIO

from django.db import transaction
from django.db.models import Q, Sum
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import get_role_name
from apps.appointments.models import Appointment
from apps.appointments.serializers import build_availability
from apps.audit.models import AuditLog
from apps.audit.services import log_audit_event
from apps.billing.models import CreditNote, Invoice, Payment
from apps.billing.views import render_credit_note_pdf, render_invoice_pdf, render_payment_receipt_pdf
from apps.clinic_settings.models import get_or_create_clinic_settings, get_or_create_workflow_settings
from apps.doctors.models import DoctorProfile, MedicalSpecialty
from apps.documents.models import ClinicalDocument
from apps.medical_records.models import ClinicalConsultation, MedicalRecord
from apps.notifications.models import Notification
from apps.notifications.services import create_notification
from apps.patients.models import Patient
from apps.patient_portal.services import (
    PatientPortalAppointmentError,
    create_patient_appointment,
    request_idempotency_key,
    reschedule_patient_appointment,
)
from apps.patient_portal.serializers import (
    MedicalRecordSummarySerializer,
    PatientAppointmentCancelSerializer,
    PatientAppointmentRequestSerializer,
    PatientAppointmentRescheduleSerializer,
    PatientPortalDashboardSerializer,
    PatientPortalDoctorSerializer,
    PatientPortalAppointmentSerializer,
    PatientPortalCreditNoteSerializer,
    PatientPortalInvoiceDetailSerializer,
    PatientPortalInvoiceListSerializer,
    PatientPortalMedicalOrderSerializer,
    PatientPortalNotificationSerializer,
    PatientPortalPaymentSerializer,
    PatientPortalProfileSerializer,
    PatientPortalProfileUpdateSerializer,
    PatientPortalPrescriptionSerializer,
    PatientPortalSpecialtySerializer,
)
from apps.hospitalization.models import DischargeSummary
from apps.hospitalization.serializers import DischargeSummarySerializer
from apps.prescriptions.models import Diagnosis, MedicalOrder, Prescription
from apps.subscriptions.services import check_feature_enabled, is_subscription_active


def patient_for_user(user):
    if not getattr(user, "is_authenticated", False) or not getattr(user, "is_active", False):
        return None
    return Patient.objects.select_related("clinic", "user").filter(
        user=user,
        activo=True,
        clinic__activo=True,
    ).first()


def portal_denied(message="Esta funcion no esta habilitada para tu clinica."):
    return Response({"detail": message}, status=status.HTTP_403_FORBIDDEN)


class PatientPortalBaseView(APIView):
    permission_classes = [IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        self.patient = patient_for_user(request.user)
        if str(get_role_name(request.user) or "").lower() not in ["paciente", "patient"] or not self.patient:
            self.permission_denied(request, message="Solo pacientes pueden usar el portal.")
        self.clinic_settings = get_or_create_clinic_settings(self.patient.clinic)
        self.workflow_settings = get_or_create_workflow_settings(self.patient.clinic)
        if not self.clinic_settings.allow_patient_portal:
            self.permission_denied(request, message="El portal paciente no esta habilitado para tu clinica.")
        if not is_subscription_active(self.patient.clinic) or not check_feature_enabled(self.patient.clinic, "patient_portal"):
            self.permission_denied(request, message="El portal paciente no esta disponible por la suscripcion actual.")

    def permissions_payload(self):
        return {
            "can_view_medical_record": self.clinic_settings.allow_patient_medical_record_view,
            "can_view_prescriptions": self.clinic_settings.allow_patient_prescription_view,
            "can_view_invoices": self.clinic_settings.allow_patient_invoice_view,
            "can_view_payments": self.clinic_settings.allow_patient_invoice_view,
            "can_view_credit_notes": self.clinic_settings.allow_patient_invoice_view,
            "can_download_invoice_pdf": self.clinic_settings.allow_patient_invoice_view,
            "can_download_receipts": self.clinic_settings.allow_patient_invoice_view,
            "can_view_medical_orders": self.clinic_settings.allow_patient_medical_record_view,
            "can_view_documents": self.clinic_settings.allow_patient_medical_record_view,
            "can_request_appointments": self.workflow_settings.allow_appointments,
            "can_request_in_person_appointments": self.workflow_settings.allow_in_person_appointments,
            "can_request_online_appointments": self.workflow_settings.allow_online_appointments,
            "can_reschedule_appointments": self.workflow_settings.allow_appointments,
            "can_cancel_appointments": self.clinic_settings.allow_patient_cancellations,
        }

    def audit(self, action, module, *, obj=None, description="", metadata=None, old_values=None, new_values=None):
        return log_audit_event(
            request=self.request,
            user=self.request.user,
            clinic=self.patient.clinic,
            action=action,
            module=module,
            obj=obj,
            description=description,
            metadata={"patient_id": self.patient.id, **(metadata or {})},
            old_values=old_values,
            new_values=new_values,
        )

    def clinic_payload(self):
        clinic = self.patient.clinic
        return {
            "id": clinic.id,
            "nombre": clinic.nombre,
            "telefono": clinic.telefono,
            "correo": clinic.correo,
            "direccion": clinic.direccion,
            "logo_url": self.clinic_settings.logo_url,
            "primary_color": self.clinic_settings.primary_color,
            "secondary_color": self.clinic_settings.secondary_color,
            "accent_color": self.clinic_settings.accent_color,
            "currency": self.clinic_settings.currency,
            "language": self.clinic_settings.language,
            "business_start_time": self.clinic_settings.business_start_time,
            "business_end_time": self.clinic_settings.business_end_time,
            "working_days": self.clinic_settings.working_days,
            "allow_online_appointments": self.workflow_settings.allow_online_appointments,
            "allow_in_person_appointments": self.workflow_settings.allow_in_person_appointments,
            "allow_patient_cancellations": self.clinic_settings.allow_patient_cancellations,
            "terms_and_conditions": self.clinic_settings.terms_and_conditions,
            "privacy_policy": self.clinic_settings.privacy_policy,
        }


class PatientPortalDashboardView(PatientPortalBaseView):
    serializer_class = PatientPortalDashboardSerializer

    def get(self, request):
        today = timezone.localdate()
        upcoming = Appointment.objects.filter(patient=self.patient, clinic=self.patient.clinic, scheduled_date__gte=today, activo=True).exclude(status=Appointment.Status.CANCELADA).select_related("doctor__user", "doctor__specialty", "clinic")[:5]
        prescriptions = Prescription.objects.filter(patient=self.patient, clinic=self.patient.clinic, status=Prescription.Status.EMITIDA, activo=True).select_related("clinic", "doctor__user")[:5]
        orders = MedicalOrder.objects.filter(patient=self.patient, clinic=self.patient.clinic, activo=True).exclude(status=MedicalOrder.Status.CANCELADA).select_related("clinic", "doctor__user")[:5]
        pending_invoices = Invoice.objects.filter(patient=self.patient, clinic=self.patient.clinic, status__in=[Invoice.Status.PENDIENTE, Invoice.Status.PARCIAL], active=True).select_related("clinic", "patient").prefetch_related("credit_notes")
        invoices = pending_invoices[:5] if self.clinic_settings.allow_patient_invoice_view else []
        pending_summary = pending_invoices.aggregate(balance=Sum("balance_due")) if self.clinic_settings.allow_patient_invoice_view else {}
        pending_count = pending_invoices.count() if self.clinic_settings.allow_patient_invoice_view else 0
        pending_balance = pending_summary.get("balance") or 0
        last_payment = Payment.objects.filter(patient=self.patient, clinic=self.patient.clinic, active=True, status=Payment.Status.APLICADO).select_related("clinic", "invoice").first() if self.clinic_settings.allow_patient_invoice_view else None
        new_documents_count = ClinicalDocument.objects.filter(patient=self.patient, clinic=self.patient.clinic, visible_to_patient=True, active=True, status=ClinicalDocument.Status.ACTIVE).count()
        unread = Notification.objects.filter(recipient=request.user, clinic=self.patient.clinic, status=Notification.Status.UNREAD).count()
        data = {
            "patient": self.patient,
            "upcoming_appointments": upcoming,
            "recent_prescriptions": prescriptions,
            "recent_orders": orders,
            "pending_invoices": invoices,
            "pending_invoices_count": pending_count,
            "pending_balance": pending_balance,
            "last_payment": last_payment,
            "new_documents_count": new_documents_count,
            "unread_notifications": unread,
            "clinic": self.clinic_payload(),
            "permissions": self.permissions_payload(),
            "available_actions": self.permissions_payload(),
        }
        self.audit(AuditLog.Action.VIEW, AuditLog.Module.PATIENTS, obj=self.patient, description="Paciente consultó su dashboard.")
        return Response(PatientPortalDashboardSerializer(data).data)


class PatientPortalProfileView(PatientPortalBaseView):
    serializer_class = PatientPortalProfileSerializer

    def get(self, request):
        self.audit(AuditLog.Action.VIEW, AuditLog.Module.PATIENTS, obj=self.patient, description="Paciente consultó su perfil.")
        return Response(PatientPortalProfileSerializer(self.patient).data)

    def patch(self, request):
        before = PatientPortalProfileSerializer(self.patient).data
        serializer = PatientPortalProfileUpdateSerializer(self.patient, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        after = PatientPortalProfileSerializer(self.patient).data
        self.audit(AuditLog.Action.UPDATE, AuditLog.Module.PATIENTS, obj=self.patient, description="Paciente actualizó campos permitidos de su perfil.", old_values=before, new_values=after)
        return Response(PatientPortalProfileSerializer(self.patient).data)


class PatientPortalDischargeSummariesView(PatientPortalBaseView):
    """Expose only signed discharge documents belonging to the authenticated patient."""

    def get(self, request, summary_id=None):
        queryset = DischargeSummary.objects.filter(
            hospitalization__patient=self.patient,
            hospitalization__clinic=self.patient.clinic,
            status=DischargeSummary.Status.SIGNED,
        ).select_related("hospitalization", "doctor__user", "signed_by", "prescription")
        if summary_id:
            summary = queryset.filter(pk=summary_id).first()
            if not summary:
                return Response({"detail": "No se encontro el resumen de egreso solicitado."}, status=status.HTTP_404_NOT_FOUND)
            log_audit_event(request=request, user=request.user, clinic=self.patient.clinic, action=AuditLog.Action.VIEW, module=AuditLog.Module.MEDICAL_RECORDS, obj=summary, description="Paciente consulto resumen de egreso autorizado.")
            return Response(DischargeSummarySerializer(summary).data)
        return Response(DischargeSummarySerializer(queryset, many=True).data)

class PatientPortalAppointmentsView(PatientPortalBaseView):
    serializer_class = PatientPortalAppointmentSerializer

    def get(self, request, appointment_id=None):
        qs = Appointment.objects.filter(patient=self.patient, clinic=self.patient.clinic).select_related("clinic", "patient", "doctor__user", "doctor__specialty", "created_by")
        if request.query_params.get("status"):
            qs = qs.filter(status=request.query_params["status"])
        if request.query_params.get("date_from"):
            qs = qs.filter(scheduled_date__gte=request.query_params["date_from"])
        if request.query_params.get("date_to"):
            qs = qs.filter(scheduled_date__lte=request.query_params["date_to"])
        if appointment_id:
            appointment = qs.filter(id=appointment_id).first()
            if not appointment:
                self.audit(AuditLog.Action.PERMISSION_DENIED, AuditLog.Module.APPOINTMENTS, description="Intento bloqueado de consultar una cita ajena o inexistente.", metadata={"requested_id": appointment_id})
                return Response({"detail": "Cita no encontrada."}, status=status.HTTP_404_NOT_FOUND)
            self.audit(AuditLog.Action.VIEW, AuditLog.Module.APPOINTMENTS, obj=appointment, description="Paciente consultó el detalle de su cita.")
            return Response(PatientPortalAppointmentSerializer(appointment).data)
        self.audit(AuditLog.Action.VIEW, AuditLog.Module.APPOINTMENTS, description="Paciente consultó su listado de citas.")
        return Response(PatientPortalAppointmentSerializer(qs, many=True).data)


class PatientPortalAppointmentRequestView(PatientPortalBaseView):
    serializer_class = PatientAppointmentRequestSerializer

    def post(self, request):
        serializer = PatientAppointmentRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            appointment = create_patient_appointment(
                patient=self.patient,
                user=request.user,
                validated_data=serializer.validated_data,
                idempotency_key=request_idempotency_key(request),
            )
        except PatientPortalAppointmentError as exc:
            self.audit(AuditLog.Action.PERMISSION_DENIED, AuditLog.Module.APPOINTMENTS, description="Solicitud de cita bloqueada por validación del portal.", metadata={"reason": str(exc)})
            return Response(exc.payload(), status=exc.status_code)
        replay = bool(getattr(appointment, "_idempotent_replay", False))
        if not replay:
            self.audit(AuditLog.Action.CREATE, AuditLog.Module.APPOINTMENTS, obj=appointment, description="Paciente solicitó una cita desde el portal.", new_values={"scheduled_date": appointment.scheduled_date, "start_time": appointment.start_time, "doctor": appointment.doctor_id, "modality": appointment.modality})
            create_notification(
                appointment.doctor.user,
                "Nueva solicitud de cita",
                f"{self.patient.nombre_completo} solicitó una cita para {appointment.scheduled_date} a las {appointment.start_time}.",
                clinic=appointment.clinic,
                notification_type=Notification.Type.INFO,
                module=Notification.Module.APPOINTMENTS,
                related_model="Appointment",
                related_object_id=appointment.id,
                action_url=f"/clinic/appointments/{appointment.id}",
            )
        return Response(PatientPortalAppointmentSerializer(appointment).data, status=status.HTTP_200_OK if replay else status.HTTP_201_CREATED)


class PatientPortalAppointmentCancelView(PatientPortalBaseView):
    serializer_class = PatientAppointmentCancelSerializer

    def patch(self, request, appointment_id):
        if not self.clinic_settings.allow_patient_cancellations:
            return portal_denied("Las cancelaciones de paciente no estan habilitadas para tu clinica.")
        serializer = PatientAppointmentCancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            appointment = Appointment.objects.select_for_update().filter(id=appointment_id, patient=self.patient, clinic=self.patient.clinic).first()
            if not appointment:
                self.audit(AuditLog.Action.PERMISSION_DENIED, AuditLog.Module.APPOINTMENTS, description="Intento bloqueado de cancelar una cita ajena o inexistente.", metadata={"requested_id": appointment_id})
                return Response({"detail": "Cita no encontrada."}, status=status.HTTP_404_NOT_FOUND)
            if appointment.status not in [Appointment.Status.PENDIENTE, Appointment.Status.CONFIRMADA, Appointment.Status.REPROGRAMADA] or not appointment.activo:
                return Response({"detail": "Esta cita ya no puede cancelarse desde el portal."}, status=status.HTTP_409_CONFLICT)
            scheduled_at = timezone.make_aware(datetime.combine(appointment.scheduled_date, appointment.start_time))
            limit = timezone.now() + timedelta(hours=self.clinic_settings.cancellation_hours_limit)
            if scheduled_at < limit:
                return Response({"detail": "Esta cita ya no puede cancelarse desde el portal. Comunícate con la clínica."}, status=status.HTTP_400_BAD_REQUEST)
            old_values = {"status": appointment.status, "activo": appointment.activo}
            appointment.status = Appointment.Status.CANCELADA
            appointment.activo = False
            appointment.cancellation_reason = serializer.validated_data["reason"]
            appointment.cancelled_by = request.user
            appointment.cancelled_at = timezone.now()
            appointment.save(update_fields=["status", "activo", "cancellation_reason", "cancelled_by", "cancelled_at", "actualizado_en"])
        self.audit(AuditLog.Action.CANCEL, AuditLog.Module.APPOINTMENTS, obj=appointment, description="Paciente canceló su cita desde el portal.", old_values=old_values, new_values={"status": appointment.status, "reason": appointment.cancellation_reason})
        return Response(PatientPortalAppointmentSerializer(appointment).data)

    def post(self, request, appointment_id):
        return self.patch(request, appointment_id)


class PatientPortalAppointmentRescheduleView(PatientPortalBaseView):
    serializer_class = PatientAppointmentRescheduleSerializer

    def post(self, request, appointment_id):
        serializer = PatientAppointmentRescheduleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            appointment, old_values = reschedule_patient_appointment(
                appointment_id=appointment_id,
                patient=self.patient,
                user=request.user,
                validated_data=serializer.validated_data,
                idempotency_key=request_idempotency_key(request),
            )
        except PatientPortalAppointmentError as exc:
            self.audit(AuditLog.Action.PERMISSION_DENIED, AuditLog.Module.APPOINTMENTS, description="Reprogramación bloqueada por validación del portal.", metadata={"requested_id": appointment_id, "reason": str(exc)})
            return Response(exc.payload(), status=exc.status_code)
        replay = bool(getattr(appointment, "_idempotent_replay", False))
        if not replay:
            self.audit(AuditLog.Action.UPDATE, AuditLog.Module.APPOINTMENTS, obj=appointment, description="Paciente reprogramó su cita desde el portal.", old_values=old_values, new_values={"scheduled_date": appointment.scheduled_date, "start_time": appointment.start_time, "status": appointment.status, "reason": appointment.last_reschedule_reason})
            message = f"Cita reprogramada para {appointment.scheduled_date} a las {appointment.start_time}."
            for recipient in [appointment.doctor.user, appointment.patient.user]:
                create_notification(recipient, "Cita reprogramada", message, clinic=appointment.clinic, notification_type=Notification.Type.REMINDER, module=Notification.Module.APPOINTMENTS, priority=Notification.Priority.HIGH, related_model="Appointment", related_object_id=appointment.id, action_url=f"/clinic/appointments/{appointment.id}")
        return Response(PatientPortalAppointmentSerializer(appointment).data)


class PatientPortalDoctorsView(PatientPortalBaseView):
    serializer_class = PatientPortalDoctorSerializer

    def get(self, request):
        qs = DoctorProfile.objects.filter(clinic=self.patient.clinic, activo=True, user__is_active=True).select_related("user", "specialty")
        if request.query_params.get("specialty"):
            qs = qs.filter(specialty_id=request.query_params["specialty"])
        if request.query_params.get("search"):
            search = request.query_params["search"]
            qs = qs.filter(user__nombre_completo__icontains=search)
        return Response(PatientPortalDoctorSerializer(qs, many=True).data)


class PatientPortalDoctorAvailabilityView(PatientPortalBaseView):
    serializer_class = PatientPortalDoctorSerializer

    def get(self, request, doctor_id):
        doctor = DoctorProfile.objects.filter(id=doctor_id, clinic=self.patient.clinic, activo=True).first()
        if not doctor:
            return Response({"detail": "Medico no encontrado."}, status=status.HTTP_404_NOT_FOUND)
        date_value = request.query_params.get("date")
        if not date_value:
            return Response({"detail": "date es obligatorio."}, status=status.HTTP_400_BAD_REQUEST)
        modality = request.query_params.get("modality") or Appointment.Modality.PRESENCIAL
        if modality not in Appointment.Modality.values:
            return Response({"modality": ["Selecciona una modalidad válida."]}, status=status.HTTP_400_BAD_REQUEST)
        if modality == Appointment.Modality.ONLINE and (not self.workflow_settings.allow_online_appointments or not doctor.atiende_virtual):
            return Response(
                {
                    "doctor": doctor.id,
                    "date": date_value,
                    "available_slots": [],
                    "booked_slots": [],
                    "allow_online_appointments": False,
                    "message": "Esta clínica no tiene habilitadas las citas en línea. Puedes solicitar una cita presencial.",
                }
            )
        if modality == Appointment.Modality.PRESENCIAL and (not self.workflow_settings.allow_in_person_appointments or not doctor.atiende_presencial):
            return Response({"modality": ["El médico no tiene habilitadas las citas presenciales."]}, status=status.HTTP_400_BAD_REQUEST)
        try:
            target_date = datetime.fromisoformat(date_value).date()
        except ValueError:
            return Response({"date": ["Ingresa una fecha valida en formato YYYY-MM-DD."]}, status=status.HTTP_400_BAD_REQUEST)
        availability = build_availability(doctor, target_date)
        availability["allow_online_appointments"] = self.workflow_settings.allow_online_appointments
        availability["modality"] = modality
        if not availability.get("available_slots"):
            availability["message"] = "No hay horarios disponibles para la fecha seleccionada."
        return Response(availability)


class PatientPortalSpecialtiesView(PatientPortalBaseView):
    serializer_class = PatientPortalSpecialtySerializer

    def get(self, request):
        qs = MedicalSpecialty.objects.filter(activo=True, doctor_profiles__clinic=self.patient.clinic, doctor_profiles__activo=True, doctor_profiles__user__is_active=True).distinct()
        return Response(PatientPortalSpecialtySerializer(qs, many=True).data)


class PatientPortalPrescriptionsView(PatientPortalBaseView):
    serializer_class = PatientPortalPrescriptionSerializer

    def get(self, request, prescription_id=None):
        if not self.clinic_settings.allow_patient_prescription_view:
            return portal_denied()
        qs = Prescription.objects.filter(patient=self.patient, clinic=self.patient.clinic, status=Prescription.Status.EMITIDA, activo=True).select_related("clinic", "patient", "doctor__user")
        if prescription_id:
            item = qs.filter(id=prescription_id).first()
            if not item:
                self.audit(AuditLog.Action.PERMISSION_DENIED, AuditLog.Module.PRESCRIPTIONS, description="Intento bloqueado de consultar una receta ajena o no visible.", metadata={"requested_id": prescription_id})
                return Response({"detail": "Receta no encontrada."}, status=status.HTTP_404_NOT_FOUND)
            self.audit(AuditLog.Action.VIEW, AuditLog.Module.PRESCRIPTIONS, obj=item, description="Paciente consultó una receta emitida.")
            return Response(PatientPortalPrescriptionSerializer(item).data)
        self.audit(AuditLog.Action.VIEW, AuditLog.Module.PRESCRIPTIONS, description="Paciente consultó sus recetas emitidas.")
        return Response(PatientPortalPrescriptionSerializer(qs, many=True).data)


class PatientPortalPrescriptionPdfView(PatientPortalBaseView):
    def get(self, request, prescription_id):
        if not self.clinic_settings.allow_patient_prescription_view:
            return portal_denied()
        prescription = Prescription.objects.select_related("clinic", "patient", "doctor__user").prefetch_related("items").filter(
            id=prescription_id,
            patient=self.patient,
            clinic=self.patient.clinic,
            status=Prescription.Status.EMITIDA,
            activo=True,
        ).first()
        if not prescription:
            return Response({"detail": "Receta no encontrada."}, status=status.HTTP_404_NOT_FOUND)
        from apps.prescriptions.views import render_prescription_pdf

        response = HttpResponse(render_prescription_pdf(prescription), content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="receta-{prescription.prescription_number}.pdf"'
        log_audit_event(request=request, clinic=prescription.clinic, action=AuditLog.Action.DOWNLOAD, module=AuditLog.Module.PRESCRIPTIONS, model_name="Prescription", object_id=prescription.id, object_repr=prescription.prescription_number, description="Paciente descargó PDF de receta emitida.", metadata={"patient_id": self.patient.id})
        return response


class PatientPortalMedicalOrdersView(PatientPortalBaseView):
    serializer_class = PatientPortalMedicalOrderSerializer

    def get(self, request, order_id=None):
        if not self.clinic_settings.allow_patient_medical_record_view:
            return portal_denied("Tu clínica no ha habilitado la consulta de órdenes médicas desde el portal.")
        qs = MedicalOrder.objects.filter(patient=self.patient, clinic=self.patient.clinic, consultation__status=ClinicalConsultation.Status.FINALIZADA).filter(Q(activo=True) | Q(status=MedicalOrder.Status.CANCELADA)).select_related("clinic", "patient", "doctor__user")
        if order_id:
            item = qs.filter(id=order_id).first()
            if not item:
                self.audit(AuditLog.Action.PERMISSION_DENIED, AuditLog.Module.MEDICAL_ORDERS, description="Intento bloqueado de consultar una orden ajena o no visible.", metadata={"requested_id": order_id})
                return Response({"detail": "Orden no encontrada."}, status=status.HTTP_404_NOT_FOUND)
            self.audit(AuditLog.Action.VIEW, AuditLog.Module.MEDICAL_ORDERS, obj=item, description="Paciente consultó una orden médica autorizada.")
            return Response(PatientPortalMedicalOrderSerializer(item).data)
        self.audit(AuditLog.Action.VIEW, AuditLog.Module.MEDICAL_ORDERS, description="Paciente consultó sus órdenes médicas autorizadas.")
        return Response(PatientPortalMedicalOrderSerializer(qs, many=True).data)


class PatientPortalInvoicesView(PatientPortalBaseView):
    serializer_class = PatientPortalInvoiceListSerializer

    def get(self, request, invoice_id=None):
        if not self.clinic_settings.allow_patient_invoice_view:
            return portal_denied("Tu clínica no ha habilitado esta información en el portal.")
        qs = Invoice.objects.filter(patient=self.patient, clinic=self.patient.clinic).filter(
            Q(active=True) | Q(status=Invoice.Status.ANULADA) | Q(fiscal_status=Invoice.FiscalStatus.CANCELLED)
        ).select_related("clinic", "patient").prefetch_related("credit_notes", "items", "payments")
        if invoice_id:
            item = qs.filter(id=invoice_id).first()
            if not item:
                self.audit(AuditLog.Action.PERMISSION_DENIED, AuditLog.Module.BILLING, description="Intento bloqueado de consultar una factura ajena.", metadata={"requested_id": invoice_id})
                return Response({"detail": "Factura no encontrada."}, status=status.HTTP_404_NOT_FOUND)
            self.audit(AuditLog.Action.VIEW, AuditLog.Module.BILLING, obj=item, description="Paciente consultó una factura propia.")
            return Response(PatientPortalInvoiceDetailSerializer(item).data)
        self.audit(AuditLog.Action.VIEW, AuditLog.Module.BILLING, description="Paciente consultó sus facturas.")
        return Response(PatientPortalInvoiceListSerializer(qs, many=True).data)


class PatientPortalPaymentsView(PatientPortalBaseView):
    serializer_class = PatientPortalPaymentSerializer

    def get(self, request, payment_id=None):
        if not self.clinic_settings.allow_patient_invoice_view:
            return portal_denied("Tu clínica no ha habilitado esta información en el portal.")
        qs = Payment.objects.filter(patient=self.patient, clinic=self.patient.clinic).filter(
            Q(active=True) | Q(status=Payment.Status.ANULADO)
        ).select_related("clinic", "invoice", "patient")
        if payment_id:
            payment = qs.filter(id=payment_id).first()
            if not payment:
                self.audit(AuditLog.Action.PERMISSION_DENIED, AuditLog.Module.PAYMENTS, description="Intento bloqueado de consultar un pago ajeno.", metadata={"requested_id": payment_id})
                return Response({"detail": "Pago no encontrado."}, status=status.HTTP_404_NOT_FOUND)
            self.audit(AuditLog.Action.VIEW, AuditLog.Module.PAYMENTS, obj=payment, description="Paciente consultó un pago propio.")
            return Response(PatientPortalPaymentSerializer(payment).data)
        self.audit(AuditLog.Action.VIEW, AuditLog.Module.PAYMENTS, description="Paciente consultó sus pagos.")
        return Response(PatientPortalPaymentSerializer(qs, many=True).data)


class PatientPortalPaymentReceiptView(PatientPortalBaseView):
    def get(self, request, payment_id):
        if not self.clinic_settings.allow_patient_invoice_view:
            return portal_denied("Tu clínica no ha habilitado esta información en el portal.")
        payment = (
            Payment.objects.filter(
                id=payment_id,
                patient=self.patient,
                clinic=self.patient.clinic,
                active=True,
                status=Payment.Status.APLICADO,
            )
            .select_related("clinic", "invoice", "patient", "received_by")
            .first()
        )
        if not payment:
            return Response({"detail": "Pago no encontrado."}, status=status.HTTP_404_NOT_FOUND)
        log_audit_event(request=request, clinic=payment.clinic, action=AuditLog.Action.DOWNLOAD, module=AuditLog.Module.PAYMENTS, model_name="Payment", object_id=payment.id, object_repr=payment.payment_number, description="Paciente descargo recibo de pago.")
        response = HttpResponse(render_payment_receipt_pdf(payment), content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="recibo-{payment.payment_number}.pdf"'
        response["Cache-Control"] = "private, no-store"
        return response


class PatientPortalInvoicePdfView(PatientPortalBaseView):
    def get(self, request, invoice_id):
        if not self.clinic_settings.allow_patient_invoice_view:
            return portal_denied("Tu clínica no ha habilitado esta información en el portal.")
        invoice = Invoice.objects.filter(
            id=invoice_id, patient=self.patient, clinic=self.patient.clinic, active=True
        ).select_related("clinic", "patient").prefetch_related("items").first()
        if not invoice:
            self.audit(AuditLog.Action.PERMISSION_DENIED, AuditLog.Module.BILLING, description="Intento bloqueado de descargar una factura ajena.", metadata={"requested_id": invoice_id})
            return Response({"detail": "Factura no encontrada."}, status=status.HTTP_404_NOT_FOUND)
        if invoice.is_fiscal and invoice.fiscal_status not in [Invoice.FiscalStatus.ISSUED, Invoice.FiscalStatus.CANCELLED]:
            return Response({"detail": "La factura fiscal aún no está emitida."}, status=status.HTTP_400_BAD_REQUEST)
        self.audit(AuditLog.Action.DOWNLOAD, AuditLog.Module.BILLING, obj=invoice, description="Paciente descargó el PDF de una factura propia.")
        response = HttpResponse(render_invoice_pdf(invoice), content_type="application/pdf")
        number = invoice.fiscal_number or invoice.invoice_number
        response["Content-Disposition"] = f'attachment; filename="factura-{number}.pdf"'
        response["Cache-Control"] = "private, no-store"
        return response


class PatientPortalInvoiceFiscalPdfView(PatientPortalBaseView):
    def get(self, request, invoice_id):
        if not self.clinic_settings.allow_patient_invoice_view:
            return portal_denied("Tu clínica no ha habilitado esta información en el portal.")
        invoice = (
            Invoice.objects.filter(patient=self.patient, clinic=self.patient.clinic, active=True, id=invoice_id)
            .select_related("clinic", "patient")
            .prefetch_related("items")
            .first()
        )
        if not invoice:
            self.audit(AuditLog.Action.PERMISSION_DENIED, AuditLog.Module.BILLING, description="Intento bloqueado de descargar una factura fiscal ajena.", metadata={"requested_id": invoice_id})
            return Response({"detail": "Factura no encontrada."}, status=status.HTTP_404_NOT_FOUND)
        if invoice.fiscal_status not in [Invoice.FiscalStatus.ISSUED, Invoice.FiscalStatus.CANCELLED]:
            return Response({"detail": "La factura fiscal aun no esta emitida."}, status=status.HTTP_400_BAD_REQUEST)

        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table as PdfTable

        stream = BytesIO()
        doc = SimpleDocTemplate(stream, pagesize=letter, rightMargin=32, leftMargin=32, topMargin=32, bottomMargin=32)
        styles = getSampleStyleSheet()
        story = [
            Paragraph(invoice.emitter_legal_name or invoice.clinic.nombre, styles["Title"]),
            Paragraph(f"RTN: {invoice.emitter_rtn or '-'}", styles["Normal"]),
            Paragraph(invoice.emitter_address or invoice.clinic.direccion or "", styles["Normal"]),
            Spacer(1, 8),
            Paragraph(f"FACTURA FISCAL: {invoice.fiscal_number}", styles["Heading2"]),
            Paragraph(f"CAI: {invoice.cai}", styles["Normal"]),
            Paragraph(f"Rango autorizado: {invoice.fiscal_range_start} a {invoice.fiscal_range_end}", styles["Normal"]),
            Paragraph(f"Fecha limite de emision: {invoice.fiscal_expiration_date}", styles["Normal"]),
            Spacer(1, 8),
            Paragraph(f"Cliente: {invoice.customer_name or invoice.patient.nombre_completo}", styles["Normal"]),
            Paragraph(f"RTN cliente: {invoice.customer_rtn or '-'}", styles["Normal"]),
        ]
        rows = [["Cant.", "Descripcion", "Precio", "Desc.", "ISV", "Total"]]
        for item in invoice.items.filter(active=True):
            rows.append([str(item.quantity), item.description, str(item.unit_price), str(item.discount_amount), str(item.tax_amount), str(item.line_total)])
        story.extend([Spacer(1, 10), PdfTable(rows), Spacer(1, 10)])
        totals = [
            ["Importe exento", invoice.subtotal_exempt],
            ["Importe exonerado", invoice.subtotal_exonerated],
            ["Importe gravado 15%", invoice.subtotal_taxed_15],
            ["Importe gravado 18%", invoice.subtotal_taxed_18],
            ["ISV 15%", invoice.isv_15],
            ["ISV 18%", invoice.isv_18],
            ["Total", invoice.total_amount],
        ]
        story.append(PdfTable([[label, f"L {value}"] for label, value in totals]))
        story.append(Spacer(1, 8))
        story.append(Paragraph(invoice.amount_in_words or "", styles["Normal"]))
        doc.build(story)
        self.audit(AuditLog.Action.DOWNLOAD, AuditLog.Module.BILLING, obj=invoice, description="Paciente descargó el PDF fiscal de una factura propia.")
        response = HttpResponse(stream.getvalue(), content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="factura-fiscal-{invoice.fiscal_number}.pdf"'
        response["Cache-Control"] = "private, no-store"
        return response


class PatientPortalCreditNotesView(PatientPortalBaseView):
    serializer_class = PatientPortalCreditNoteSerializer

    def get(self, request, credit_note_id=None):
        if not self.clinic_settings.allow_patient_invoice_view:
            return portal_denied("Tu clínica no ha habilitado esta información en el portal.")
        qs = CreditNote.objects.filter(
            clinic=self.patient.clinic,
            original_invoice__patient=self.patient,
        ).select_related("clinic", "original_invoice")
        if credit_note_id:
            note = qs.filter(id=credit_note_id).first()
            if not note:
                self.audit(AuditLog.Action.PERMISSION_DENIED, AuditLog.Module.BILLING, description="Intento bloqueado de consultar una nota de crédito ajena.", metadata={"requested_id": credit_note_id})
                return Response({"detail": "Nota de crédito no encontrada."}, status=status.HTTP_404_NOT_FOUND)
            self.audit(AuditLog.Action.VIEW, AuditLog.Module.BILLING, obj=note, description="Paciente consultó una nota de crédito propia.")
            return Response(PatientPortalCreditNoteSerializer(note).data)
        self.audit(AuditLog.Action.VIEW, AuditLog.Module.BILLING, description="Paciente consultó sus notas de crédito.")
        return Response(PatientPortalCreditNoteSerializer(qs, many=True).data)


class PatientPortalCreditNotePdfView(PatientPortalBaseView):
    def get(self, request, credit_note_id):
        if not self.clinic_settings.allow_patient_invoice_view:
            return portal_denied("Tu clínica no ha habilitado esta información en el portal.")
        credit_note = (
            CreditNote.objects.filter(id=credit_note_id, clinic=self.patient.clinic, original_invoice__patient=self.patient, active=True)
            .select_related("clinic", "original_invoice__patient", "issued_by")
            .prefetch_related("original_invoice__items")
            .first()
        )
        if not credit_note:
            self.audit(AuditLog.Action.PERMISSION_DENIED, AuditLog.Module.BILLING, description="Intento bloqueado de descargar una nota de crédito ajena.", metadata={"requested_id": credit_note_id})
            return Response({"detail": "Nota de credito no encontrada."}, status=status.HTTP_404_NOT_FOUND)
        self.audit(AuditLog.Action.DOWNLOAD, AuditLog.Module.BILLING, obj=credit_note, description="Paciente descargó una nota de crédito propia.")
        response = HttpResponse(render_credit_note_pdf(credit_note, request), content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="nota-credito-{credit_note.fiscal_number}.pdf"'
        response["Cache-Control"] = "private, no-store"
        return response


class PatientPortalMedicalRecordSummaryView(PatientPortalBaseView):
    serializer_class = MedicalRecordSummarySerializer

    def get(self, request):
        if not self.clinic_settings.allow_patient_medical_record_view:
            return portal_denied()
        record = MedicalRecord.objects.filter(patient=self.patient, clinic=self.patient.clinic, activo=True).first()
        if not record:
            return Response({"detail": "Expediente no encontrado."}, status=status.HTTP_404_NOT_FOUND)
        consultations = ClinicalConsultation.objects.filter(patient=self.patient, clinic=self.patient.clinic, status=ClinicalConsultation.Status.FINALIZADA, activo=True).values("id", "consultation_date", "chief_complaint", "clinical_assessment", "preliminary_diagnosis", "treatment_plan", "recommendations")[:20]
        diagnoses = Diagnosis.objects.filter(patient=self.patient, clinic=self.patient.clinic, consultation__status=ClinicalConsultation.Status.FINALIZADA, activo=True).values("id", "code", "name", "diagnosis_type", "is_primary")[:20]
        prescriptions = Prescription.objects.filter(patient=self.patient, clinic=self.patient.clinic, consultation__status=ClinicalConsultation.Status.FINALIZADA, status=Prescription.Status.EMITIDA, activo=True).values("id", "prescription_number", "issue_date", "general_instructions")[:20]
        orders = MedicalOrder.objects.filter(patient=self.patient, clinic=self.patient.clinic, consultation__status=ClinicalConsultation.Status.FINALIZADA).filter(Q(activo=True) | Q(status=MedicalOrder.Status.CANCELADA)).values("id", "order_number", "order_type", "title", "status", "priority")[:20]
        data = {
            "record_number": record.record_number,
            "blood_type": record.blood_type,
            "allergies": record.allergies,
            "chronic_diseases": record.chronic_diseases,
            "surgical_history": record.surgical_history,
            "family_history": record.family_history,
            "current_medications": record.current_medications,
            "consultations": list(consultations),
            "diagnoses": list(diagnoses),
            "prescriptions": list(prescriptions),
            "medical_orders": list(orders),
        }
        self.audit(AuditLog.Action.VIEW, AuditLog.Module.MEDICAL_RECORDS, obj=record, description="Paciente consultó el resumen autorizado de su expediente.")
        return Response(MedicalRecordSummarySerializer(data).data)


class PatientPortalNotificationsView(PatientPortalBaseView):
    serializer_class = PatientPortalNotificationSerializer

    def get(self, request):
        qs = Notification.objects.filter(recipient=request.user, clinic=self.patient.clinic).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
        )
        notification_status = request.query_params.get("status")
        if notification_status in Notification.Status.values:
            qs = qs.filter(status=notification_status)
        self.audit(AuditLog.Action.VIEW, AuditLog.Module.SYSTEM, description="Paciente consultó su bandeja de notificaciones.")
        return Response(PatientPortalNotificationSerializer(qs[:50], many=True).data)


class PatientPortalNotificationMarkReadView(PatientPortalBaseView):
    serializer_class = PatientPortalNotificationSerializer

    def patch(self, request, notification_id):
        notification = Notification.objects.filter(id=notification_id, recipient=request.user, clinic=self.patient.clinic).first()
        if not notification:
            self.audit(AuditLog.Action.PERMISSION_DENIED, AuditLog.Module.SYSTEM, description="Intento bloqueado de abrir una notificación ajena.", metadata={"requested_id": notification_id})
            return Response({"detail": "Notificacion no encontrada."}, status=status.HTTP_404_NOT_FOUND)
        if notification.status != Notification.Status.READ:
            notification.status = Notification.Status.READ
            notification.read_at = timezone.now()
            notification.save(update_fields=["status", "read_at", "actualizado_en"])
            self.audit(AuditLog.Action.VIEW, AuditLog.Module.SYSTEM, obj=notification, description="Paciente abrió una notificación propia.")
        return Response(PatientPortalNotificationSerializer(notification).data)


class PatientPortalNotificationsMarkAllReadView(PatientPortalBaseView):
    serializer_class = PatientPortalNotificationSerializer

    def post(self, request):
        qs = Notification.objects.filter(recipient=request.user, clinic=self.patient.clinic, status=Notification.Status.UNREAD)
        updated = qs.update(status=Notification.Status.READ, read_at=timezone.now())
        if updated:
            self.audit(AuditLog.Action.UPDATE, AuditLog.Module.SYSTEM, description="Paciente marcó todas sus notificaciones como leídas.", metadata={"updated": updated})
        return Response({"updated": updated})

    patch = post


class PatientPortalUnreadNotificationsView(PatientPortalBaseView):
    serializer_class = PatientPortalNotificationSerializer

    def get(self, request):
        return Response({"unread_count": Notification.objects.filter(recipient=request.user, clinic=self.patient.clinic, status=Notification.Status.UNREAD).filter(Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())).count()})


class PatientPortalClinicInfoView(PatientPortalBaseView):
    serializer_class = PatientPortalDashboardSerializer

    def get(self, request):
        return Response(self.clinic_payload())


class PatientPortalSettingsView(PatientPortalBaseView):
    serializer_class = PatientPortalDashboardSerializer

    def get(self, request):
        return Response(
            {
                "clinic": self.clinic_payload(),
                "permissions": self.permissions_payload(),
                "portal": {
                    "allow_patient_portal": self.clinic_settings.allow_patient_portal,
                    "allow_appointments": self.workflow_settings.allow_appointments,
                    "allow_online_appointments": self.workflow_settings.allow_online_appointments,
                    "allow_in_person_appointments": self.workflow_settings.allow_in_person_appointments,
                    "allow_patient_cancellations": self.clinic_settings.allow_patient_cancellations,
                    "cancellation_hours_limit": self.clinic_settings.cancellation_hours_limit,
                    "allow_patient_medical_record_view": self.clinic_settings.allow_patient_medical_record_view,
                    "allow_patient_prescription_view": self.clinic_settings.allow_patient_prescription_view,
                    "allow_patient_invoice_view": self.clinic_settings.allow_patient_invoice_view,
                    "currency": self.clinic_settings.currency,
                    "language": self.clinic_settings.language,
                    "terms_and_conditions": self.clinic_settings.terms_and_conditions,
                    "privacy_policy": self.clinic_settings.privacy_policy,
                },
            }
        )
