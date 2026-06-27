from datetime import datetime, timedelta
from io import BytesIO

from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import get_role_name
from apps.appointments.models import Appointment
from apps.appointments.serializers import AppointmentDetailSerializer, AppointmentListSerializer, build_availability
from apps.billing.models import Invoice, Payment
from apps.billing.serializers import InvoiceDetailSerializer, InvoiceListSerializer, PaymentDetailSerializer, PaymentListSerializer
from apps.clinic_settings.models import get_or_create_clinic_settings
from apps.doctors.models import DoctorProfile, MedicalSpecialty
from apps.medical_records.models import ClinicalConsultation, MedicalRecord
from apps.notifications.models import Notification
from apps.notifications.serializers import NotificationListSerializer
from apps.patients.models import Patient
from apps.patient_portal.serializers import (
    MedicalRecordSummarySerializer,
    PatientAppointmentCancelSerializer,
    PatientAppointmentRequestSerializer,
    PatientPortalDashboardSerializer,
    PatientPortalDoctorSerializer,
    PatientPortalProfileSerializer,
    PatientPortalProfileUpdateSerializer,
    PatientPortalSpecialtySerializer,
)
from apps.prescriptions.models import Diagnosis, MedicalOrder, Prescription
from apps.prescriptions.serializers import MedicalOrderDetailSerializer, MedicalOrderListSerializer, PrescriptionDetailSerializer, PrescriptionListSerializer
from apps.subscriptions.services import check_feature_enabled, is_subscription_active


def patient_for_user(user):
    return Patient.objects.select_related("clinic", "user").filter(user=user, activo=True).first()


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
        if not self.clinic_settings.allow_patient_portal:
            self.permission_denied(request, message="El portal paciente no esta habilitado para tu clinica.")
        if not is_subscription_active(self.patient.clinic) or not check_feature_enabled(self.patient.clinic, "patient_portal"):
            self.permission_denied(request, message="El portal paciente no esta disponible por la suscripcion actual.")

    def permissions_payload(self):
        return {
            "can_view_medical_record": self.clinic_settings.allow_patient_medical_record_view,
            "can_view_prescriptions": self.clinic_settings.allow_patient_prescription_view,
            "can_view_invoices": self.clinic_settings.allow_patient_invoice_view,
            "can_request_appointments": True,
            "can_cancel_appointments": self.clinic_settings.allow_patient_cancellations,
        }

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
            "allow_online_appointments": self.clinic_settings.allow_online_appointments,
            "allow_patient_cancellations": self.clinic_settings.allow_patient_cancellations,
            "terms_and_conditions": self.clinic_settings.terms_and_conditions,
            "privacy_policy": self.clinic_settings.privacy_policy,
        }


class PatientPortalDashboardView(PatientPortalBaseView):
    serializer_class = PatientPortalDashboardSerializer

    def get(self, request):
        today = timezone.localdate()
        upcoming = Appointment.objects.filter(patient=self.patient, scheduled_date__gte=today).exclude(status=Appointment.Status.CANCELADA).select_related("doctor__user", "doctor__specialty", "clinic")[:5]
        prescriptions = Prescription.objects.filter(patient=self.patient, status=Prescription.Status.EMITIDA, activo=True).select_related("clinic", "doctor__user")[:5]
        invoices = Invoice.objects.filter(patient=self.patient, status__in=[Invoice.Status.PENDIENTE, Invoice.Status.PARCIAL], active=True).select_related("clinic", "patient")[:5]
        unread = Notification.objects.filter(recipient=request.user, status=Notification.Status.UNREAD).count()
        data = {
            "patient": self.patient,
            "upcoming_appointments": upcoming,
            "recent_prescriptions": prescriptions,
            "pending_invoices": invoices,
            "unread_notifications": unread,
            "clinic": self.clinic_payload(),
            "permissions": self.permissions_payload(),
        }
        return Response(PatientPortalDashboardSerializer(data).data)


class PatientPortalProfileView(PatientPortalBaseView):
    serializer_class = PatientPortalProfileSerializer

    def get(self, request):
        return Response(PatientPortalProfileSerializer(self.patient).data)

    def patch(self, request):
        serializer = PatientPortalProfileUpdateSerializer(self.patient, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(PatientPortalProfileSerializer(self.patient).data)


class PatientPortalAppointmentsView(PatientPortalBaseView):
    serializer_class = AppointmentListSerializer

    def get(self, request, appointment_id=None):
        qs = Appointment.objects.filter(patient=self.patient).select_related("clinic", "patient", "doctor__user", "doctor__specialty", "created_by")
        if request.query_params.get("status"):
            qs = qs.filter(status=request.query_params["status"])
        if request.query_params.get("date_from"):
            qs = qs.filter(scheduled_date__gte=request.query_params["date_from"])
        if request.query_params.get("date_to"):
            qs = qs.filter(scheduled_date__lte=request.query_params["date_to"])
        if appointment_id:
            appointment = qs.filter(id=appointment_id).first()
            if not appointment:
                return Response({"detail": "Cita no encontrada."}, status=status.HTTP_404_NOT_FOUND)
            return Response(AppointmentDetailSerializer(appointment).data)
        return Response(AppointmentListSerializer(qs, many=True).data)


class PatientPortalAppointmentRequestView(PatientPortalBaseView):
    serializer_class = PatientAppointmentRequestSerializer

    def post(self, request):
        serializer = PatientAppointmentRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        modality = serializer.validated_data.get("modality", Appointment.Modality.PRESENCIAL)
        if modality == Appointment.Modality.ONLINE and not self.clinic_settings.allow_online_appointments:
            return Response(
                {"modality": ["Esta clínica no tiene habilitadas las citas en línea. Puedes solicitar una cita presencial."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        doctor = serializer.validated_data["doctor"]
        if doctor.clinic_id != self.patient.clinic_id:
            return Response({"detail": "El medico no pertenece a tu clinica."}, status=status.HTTP_400_BAD_REQUEST)
        scheduled_date = serializer.validated_data["scheduled_date"]
        start_time = serializer.validated_data["start_time"]
        availability = build_availability(doctor, scheduled_date)
        slot = next((item for item in availability["available_slots"] if item["start_time"] == start_time.strftime("%H:%M")), None)
        if not slot:
            return Response({"detail": "El horario seleccionado no esta disponible."}, status=status.HTTP_400_BAD_REQUEST)
        appointment = Appointment.objects.create(
            clinic=self.patient.clinic,
            patient=self.patient,
            doctor=doctor,
            scheduled_date=scheduled_date,
            start_time=start_time,
            end_time=datetime.strptime(slot["end_time"], "%H:%M").time(),
            modality=modality,
            reason=serializer.validated_data["reason"],
            notes=serializer.validated_data.get("notes", ""),
            status=Appointment.Status.PENDIENTE,
            created_by=request.user,
        )
        return Response(AppointmentDetailSerializer(appointment).data, status=status.HTTP_201_CREATED)


class PatientPortalAppointmentCancelView(PatientPortalBaseView):
    serializer_class = PatientAppointmentCancelSerializer

    def patch(self, request, appointment_id):
        if not self.clinic_settings.allow_patient_cancellations:
            return portal_denied("Las cancelaciones de paciente no estan habilitadas para tu clinica.")
        appointment = Appointment.objects.filter(id=appointment_id, patient=self.patient).first()
        if not appointment:
            return Response({"detail": "Cita no encontrada."}, status=status.HTTP_404_NOT_FOUND)
        if appointment.status == Appointment.Status.ATENDIDA:
            return Response({"detail": "No puedes cancelar una cita atendida."}, status=status.HTTP_400_BAD_REQUEST)
        scheduled_at = timezone.make_aware(datetime.combine(appointment.scheduled_date, appointment.start_time))
        limit = timezone.now() + timedelta(hours=self.clinic_settings.cancellation_hours_limit)
        if scheduled_at < limit:
            return Response({"detail": "La cita ya esta fuera del limite permitido para cancelacion."}, status=status.HTTP_400_BAD_REQUEST)
        serializer = PatientAppointmentCancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        appointment.status = Appointment.Status.CANCELADA
        appointment.activo = False
        appointment.cancellation_reason = serializer.validated_data.get("reason", "")
        appointment.cancelled_by = request.user
        appointment.cancelled_at = timezone.now()
        appointment.save(update_fields=["status", "activo", "cancellation_reason", "cancelled_by", "cancelled_at"])
        return Response(AppointmentDetailSerializer(appointment).data)


class PatientPortalDoctorsView(PatientPortalBaseView):
    serializer_class = PatientPortalDoctorSerializer

    def get(self, request):
        qs = DoctorProfile.objects.filter(clinic=self.patient.clinic, activo=True).select_related("user", "specialty")
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
        if modality == Appointment.Modality.ONLINE and not self.clinic_settings.allow_online_appointments:
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
        try:
            target_date = datetime.fromisoformat(date_value).date()
        except ValueError:
            return Response({"date": ["Ingresa una fecha valida en formato YYYY-MM-DD."]}, status=status.HTTP_400_BAD_REQUEST)
        availability = build_availability(doctor, target_date)
        availability["allow_online_appointments"] = self.clinic_settings.allow_online_appointments
        availability["modality"] = modality
        if not availability.get("available_slots"):
            availability["message"] = "No hay horarios disponibles para la fecha seleccionada."
        return Response(availability)


class PatientPortalSpecialtiesView(PatientPortalBaseView):
    serializer_class = PatientPortalSpecialtySerializer

    def get(self, request):
        qs = MedicalSpecialty.objects.filter(activo=True, doctor_profiles__clinic=self.patient.clinic, doctor_profiles__activo=True).distinct()
        return Response(PatientPortalSpecialtySerializer(qs, many=True).data)


class PatientPortalPrescriptionsView(PatientPortalBaseView):
    serializer_class = PrescriptionListSerializer

    def get(self, request, prescription_id=None):
        if not self.clinic_settings.allow_patient_prescription_view:
            return portal_denied()
        qs = Prescription.objects.filter(patient=self.patient, status=Prescription.Status.EMITIDA, activo=True).select_related("clinic", "patient", "doctor__user")
        if prescription_id:
            item = qs.filter(id=prescription_id).first()
            if not item:
                return Response({"detail": "Receta no encontrada."}, status=status.HTTP_404_NOT_FOUND)
            return Response(PrescriptionDetailSerializer(item).data)
        return Response(PrescriptionListSerializer(qs, many=True).data)


class PatientPortalMedicalOrdersView(PatientPortalBaseView):
    serializer_class = MedicalOrderListSerializer

    def get(self, request, order_id=None):
        qs = MedicalOrder.objects.filter(patient=self.patient, activo=True).select_related("clinic", "patient", "doctor__user")
        if order_id:
            item = qs.filter(id=order_id).first()
            if not item:
                return Response({"detail": "Orden no encontrada."}, status=status.HTTP_404_NOT_FOUND)
            return Response(MedicalOrderDetailSerializer(item).data)
        return Response(MedicalOrderListSerializer(qs, many=True).data)


class PatientPortalInvoicesView(PatientPortalBaseView):
    serializer_class = InvoiceListSerializer

    def get(self, request, invoice_id=None):
        if not self.clinic_settings.allow_patient_invoice_view:
            return portal_denied()
        qs = Invoice.objects.filter(patient=self.patient, active=True).select_related("clinic", "patient")
        if invoice_id:
            item = qs.filter(id=invoice_id).first()
            if not item:
                return Response({"detail": "Factura no encontrada."}, status=status.HTTP_404_NOT_FOUND)
            return Response(InvoiceDetailSerializer(item).data)
        return Response(InvoiceListSerializer(qs, many=True).data)


class PatientPortalPaymentsView(PatientPortalBaseView):
    serializer_class = PaymentListSerializer

    def get(self, request, payment_id=None):
        if not self.clinic_settings.allow_patient_invoice_view:
            return portal_denied()
        qs = Payment.objects.filter(patient=self.patient, active=True).select_related("invoice", "patient", "received_by")
        if payment_id:
            payment = qs.filter(id=payment_id).first()
            if not payment:
                return Response({"detail": "Pago no encontrado."}, status=status.HTTP_404_NOT_FOUND)
            return Response(PaymentDetailSerializer(payment).data)
        return Response(PaymentListSerializer(qs, many=True).data)


class PatientPortalInvoiceFiscalPdfView(PatientPortalBaseView):
    def get(self, request, invoice_id):
        if not self.clinic_settings.allow_patient_invoice_view:
            return portal_denied()
        invoice = (
            Invoice.objects.filter(patient=self.patient, active=True, id=invoice_id)
            .select_related("clinic", "patient")
            .prefetch_related("items")
            .first()
        )
        if not invoice:
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
        response = HttpResponse(stream.getvalue(), content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="factura-fiscal-{invoice.fiscal_number}.pdf"'
        return response


class PatientPortalMedicalRecordSummaryView(PatientPortalBaseView):
    serializer_class = MedicalRecordSummarySerializer

    def get(self, request):
        if not self.clinic_settings.allow_patient_medical_record_view:
            return portal_denied()
        record = MedicalRecord.objects.filter(patient=self.patient, activo=True).first()
        if not record:
            return Response({"detail": "Expediente no encontrado."}, status=status.HTTP_404_NOT_FOUND)
        consultations = ClinicalConsultation.objects.filter(patient=self.patient, status=ClinicalConsultation.Status.FINALIZADA, activo=True).values("id", "consultation_date", "chief_complaint", "clinical_assessment", "preliminary_diagnosis", "treatment_plan", "recommendations")[:20]
        diagnoses = Diagnosis.objects.filter(patient=self.patient, activo=True).values("id", "code", "name", "diagnosis_type", "is_primary")[:20]
        prescriptions = Prescription.objects.filter(patient=self.patient, status=Prescription.Status.EMITIDA, activo=True).values("id", "prescription_number", "issue_date", "general_instructions")[:20]
        orders = MedicalOrder.objects.filter(patient=self.patient, activo=True).values("id", "order_number", "order_type", "title", "status", "priority")[:20]
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
        return Response(MedicalRecordSummarySerializer(data).data)


class PatientPortalNotificationsView(PatientPortalBaseView):
    serializer_class = NotificationListSerializer

    def get(self, request):
        qs = Notification.objects.filter(recipient=request.user)
        return Response(NotificationListSerializer(qs[:50], many=True).data)


class PatientPortalNotificationMarkReadView(PatientPortalBaseView):
    serializer_class = NotificationListSerializer

    def patch(self, request, notification_id):
        notification = Notification.objects.filter(id=notification_id, recipient=request.user).first()
        if not notification:
            return Response({"detail": "Notificacion no encontrada."}, status=status.HTTP_404_NOT_FOUND)
        notification.status = Notification.Status.READ
        notification.read_at = timezone.now()
        notification.save(update_fields=["status", "read_at", "actualizado_en"])
        return Response(NotificationListSerializer(notification).data)


class PatientPortalNotificationsMarkAllReadView(PatientPortalBaseView):
    serializer_class = NotificationListSerializer

    def post(self, request):
        qs = Notification.objects.filter(recipient=request.user, status=Notification.Status.UNREAD)
        updated = qs.update(status=Notification.Status.READ, read_at=timezone.now())
        return Response({"updated": updated})


class PatientPortalUnreadNotificationsView(PatientPortalBaseView):
    serializer_class = NotificationListSerializer

    def get(self, request):
        return Response({"unread_count": Notification.objects.filter(recipient=request.user, status=Notification.Status.UNREAD).count()})


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
                    "allow_online_appointments": self.clinic_settings.allow_online_appointments,
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
