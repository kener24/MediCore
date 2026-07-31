from django.db.models import Q
from rest_framework import serializers

from apps.appointments.serializers import AppointmentDetailSerializer
from apps.appointments.models import Appointment
from apps.billing.models import CreditNote, Invoice, InvoiceItem, Payment
from apps.core.validators import validate_phone
from apps.doctors.models import DoctorProfile, MedicalSpecialty
from apps.medical_records.models import ClinicalConsultation, MedicalRecord
from apps.notifications.models import Notification
from apps.patients.models import Patient
from apps.prescriptions.models import MedicalOrder, Prescription, PrescriptionItem


class PatientPortalAppointmentSerializer(AppointmentDetailSerializer):
    """Patient-safe appointment representation without administrative ownership IDs."""

    class Meta(AppointmentDetailSerializer.Meta):
        fields = [
            "id",
            "clinic_nombre",
            "doctor",
            "doctor_nombre",
            "doctor_name",
            "specialty",
            "specialty_nombre",
            "doctor_specialty",
            "scheduled_date",
            "start_time",
            "end_time",
            "modality",
            "reason",
            "notes",
            "status",
            "status_display",
            "duration_minutes",
            "can_cancel",
            "can_reschedule",
            "activo",
            "cancellation_reason",
            "cancelled_at",
            "confirmed_at",
            "attended_at",
            "last_reschedule_reason",
            "rescheduled_at",
            "creado_en",
            "actualizado_en",
        ]


class PatientPortalPrescriptionItemSerializer(serializers.ModelSerializer):
    route_display = serializers.CharField(source="get_route_display", read_only=True)

    class Meta:
        model = PrescriptionItem
        fields = [
            "id",
            "medication_name",
            "presentation",
            "dosage",
            "frequency",
            "duration",
            "quantity",
            "route",
            "route_display",
            "instructions",
        ]


class PatientPortalPrescriptionSerializer(serializers.ModelSerializer):
    clinic_nombre = serializers.CharField(source="clinic.nombre", read_only=True)
    doctor_nombre = serializers.CharField(source="doctor.user.nombre_completo", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    prescription_type_display = serializers.CharField(source="get_prescription_type_display", read_only=True)
    medications = serializers.SerializerMethodField()
    items = PatientPortalPrescriptionItemSerializer(many=True, read_only=True)

    class Meta:
        model = Prescription
        fields = [
            "id",
            "clinic_nombre",
            "doctor_nombre",
            "prescription_number",
            "issue_date",
            "general_instructions",
            "status",
            "status_display",
            "prescription_type",
            "prescription_type_display",
            "max_dispenses",
            "refill_interval_days",
            "expires_at",
            "dispenses_used",
            "issued_at",
            "medications",
            "items",
            "creado_en",
        ]

    def get_medications(self, obj):
        return [item.medication_name for item in obj.items.filter(activo=True)[:4]]


class PatientPortalMedicalOrderSerializer(serializers.ModelSerializer):
    clinic_nombre = serializers.CharField(source="clinic.nombre", read_only=True)
    doctor_nombre = serializers.CharField(source="doctor.user.nombre_completo", read_only=True)
    order_type_display = serializers.CharField(source="get_order_type_display", read_only=True)
    priority_display = serializers.CharField(source="get_priority_display", read_only=True)
    status_display = serializers.SerializerMethodField()
    is_expired = serializers.BooleanField(read_only=True)
    result_summary = serializers.SerializerMethodField()

    class Meta:
        model = MedicalOrder
        fields = [
            "id",
            "clinic_nombre",
            "doctor_nombre",
            "order_number",
            "order_type",
            "order_type_display",
            "title",
            "description",
            "instructions",
            "priority",
            "priority_display",
            "status",
            "status_display",
            "is_expired",
            "expires_at",
            "scheduled_at",
            "execution_area",
            "started_at",
            "completed_at",
            "result_summary",
            "reviewed_at",
            "creado_en",
        ]

    def get_status_display(self, obj):
        if obj.is_expired:
            return "Vencida"
        return obj.get_status_display()

    def get_result_summary(self, obj):
        if obj.status in [MedicalOrder.Status.COMPLETADA, MedicalOrder.Status.REVISADA]:
            return obj.result_summary
        return ""


class PatientPortalInvoiceItemSerializer(serializers.ModelSerializer):
    tax_type_display = serializers.CharField(source="get_tax_type_display", read_only=True)

    class Meta:
        model = InvoiceItem
        fields = [
            "id", "description", "quantity", "unit_price", "discount_amount", "tax_type",
            "tax_type_display", "tax_rate", "subtotal", "tax_amount", "line_total",
        ]


class PatientPortalPaymentSerializer(serializers.ModelSerializer):
    clinic_nombre = serializers.CharField(source="clinic.nombre", read_only=True)
    invoice_number = serializers.CharField(source="invoice.invoice_number", read_only=True)
    method_display = serializers.CharField(source="get_method_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    reference_visible = serializers.SerializerMethodField()
    receipt_available = serializers.SerializerMethodField()
    receipt_url = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            "id", "clinic_nombre", "invoice", "invoice_number", "payment_number", "payment_date",
            "amount", "method", "method_display", "reference_visible", "notes", "status",
            "status_display", "balance_before", "balance_after", "receipt_available", "receipt_url",
            "creado_en", "actualizado_en",
        ]

    def get_reference_visible(self, obj):
        value = str(obj.reference or "").strip()
        if not value:
            return ""
        if len(value) <= 4:
            return value
        return f"****{value[-4:]}"

    def get_receipt_available(self, obj):
        return bool(obj.active and obj.status == Payment.Status.APLICADO)

    def get_receipt_url(self, obj):
        if not self.get_receipt_available(obj):
            return ""
        return f"/api/patient-portal/payments/{obj.id}/receipt/"


class PatientPortalCreditNoteSerializer(serializers.ModelSerializer):
    clinic_nombre = serializers.CharField(source="clinic.nombre", read_only=True)
    original_invoice_number = serializers.CharField(source="original_invoice.invoice_number", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    pdf_url = serializers.SerializerMethodField()

    class Meta:
        model = CreditNote
        fields = [
            "id", "clinic_nombre", "original_invoice", "original_invoice_number", "credit_note_number",
            "fiscal_number", "issue_date", "reason", "subtotal", "discount_amount", "tax_amount",
            "total_amount", "subtotal_exempt", "subtotal_exonerated", "subtotal_taxed_15",
            "subtotal_taxed_18", "isv_15", "isv_18", "amount_in_words", "status",
            "status_display", "pdf_url", "creado_en", "actualizado_en",
        ]

    def get_pdf_url(self, obj):
        return f"/api/patient-portal/credit-notes/{obj.id}/pdf/" if obj.active else ""


class PatientPortalNotificationSerializer(serializers.ModelSerializer):
    notification_type_display = serializers.SerializerMethodField()
    priority_display = serializers.SerializerMethodField()
    target = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id", "title", "message", "notification_type", "notification_type_display", "module",
            "priority", "priority_display", "status", "read_at", "sent_at", "expires_at",
            "target", "creado_en", "actualizado_en",
        ]

    def get_notification_type_display(self, obj):
        return {
            Notification.Type.INFO: "Información",
            Notification.Type.REMINDER: "Recordatorio",
            Notification.Type.ALERT: "Alerta",
            Notification.Type.WARNING: "Advertencia",
            Notification.Type.SUCCESS: "Éxito",
            Notification.Type.ERROR: "Error",
        }.get(obj.notification_type, "Notificación")

    def get_priority_display(self, obj):
        return {
            Notification.Priority.LOW: "Baja",
            Notification.Priority.NORMAL: "Normal",
            Notification.Priority.HIGH: "Alta",
            Notification.Priority.URGENT: "Urgente",
        }.get(obj.priority, "Normal")

    def get_target(self, obj):
        resource_id = str(obj.related_object_id or "").strip()
        model = str(obj.related_model or "").lower()
        routes = {
            "appointment": ("appointment", f"/patient/appointments/{resource_id}"),
            "prescription": ("prescription", f"/patient/prescriptions/{resource_id}"),
            "medicalorder": ("medical_order", f"/patient/medical-orders/{resource_id}"),
            "clinicaldocument": ("document", f"/patient/documents/{resource_id}"),
            "invoice": ("invoice", f"/patient/invoices/{resource_id}"),
            "payment": ("payment", f"/patient/payments/{resource_id}"),
            "dischargesummary": ("discharge_summary", f"/patient/discharge-summaries/{resource_id}"),
        }
        if not resource_id or model not in routes:
            return None
        target_type, path = routes[model]
        return {"type": target_type, "id": resource_id, "path": path}


class PatientPortalInvoiceListSerializer(serializers.ModelSerializer):
    clinic_nombre = serializers.CharField(source="clinic.nombre", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    fiscal_status_display = serializers.CharField(source="get_fiscal_status_display", read_only=True)
    related_credit_note = serializers.SerializerMethodField()
    pdf_available = serializers.SerializerMethodField()
    pdf_url = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            "id", "clinic_nombre", "invoice_number", "issue_date", "due_date", "status",
            "status_display", "is_fiscal", "fiscal_status", "fiscal_status_display", "fiscal_number",
            "subtotal", "discount_amount", "tax_amount", "total_amount", "subtotal_exempt",
            "subtotal_exonerated", "subtotal_taxed_15", "subtotal_taxed_18", "isv_15", "isv_18",
            "paid_amount", "balance_due", "related_credit_note", "pdf_available", "pdf_url",
            "creado_en", "actualizado_en",
        ]

    def get_related_credit_note(self, obj):
        note = obj.credit_notes.filter(active=True).order_by("-issue_datetime").first()
        return PatientPortalCreditNoteSerializer(note).data if note else None

    def get_pdf_available(self, obj):
        if not obj.active:
            return False
        if not obj.is_fiscal:
            return True
        return obj.fiscal_status in [Invoice.FiscalStatus.ISSUED, Invoice.FiscalStatus.CANCELLED]

    def get_pdf_url(self, obj):
        return f"/api/patient-portal/invoices/{obj.id}/pdf/" if self.get_pdf_available(obj) else ""


class PatientPortalInvoiceDetailSerializer(PatientPortalInvoiceListSerializer):
    patient_name = serializers.CharField(source="patient.nombre_completo", read_only=True)
    items = PatientPortalInvoiceItemSerializer(many=True, read_only=True)
    payments = serializers.SerializerMethodField()

    class Meta(PatientPortalInvoiceListSerializer.Meta):
        fields = PatientPortalInvoiceListSerializer.Meta.fields + [
            "patient_name", "customer_name", "customer_rtn", "customer_address", "notes",
            "amount_in_words", "cancellation_reason", "items", "payments",
        ]

    def get_payments(self, obj):
        payments = obj.payments.filter(patient=obj.patient, clinic=obj.clinic).filter(
            Q(active=True) | Q(status=Payment.Status.ANULADO)
        )
        return PatientPortalPaymentSerializer(payments, many=True).data


class PatientPortalProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = [
            "id",
            "codigo_paciente",
            "nombres",
            "apellidos",
            "nombre_completo",
            "identidad",
            "fecha_nacimiento",
            "genero",
            "tipo_sangre",
            "telefono",
            "correo",
            "direccion",
            "ciudad",
            "departamento",
            "pais",
            "contacto_emergencia_nombre",
            "contacto_emergencia_telefono",
            "contacto_emergencia_parentesco",
            "alergias",
            "enfermedades_cronicas",
            "activo",
        ]
        read_only_fields = ["id", "codigo_paciente", "nombres", "apellidos", "nombre_completo", "identidad", "fecha_nacimiento", "genero", "tipo_sangre", "alergias", "enfermedades_cronicas", "activo"]


class PatientPortalProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = ["telefono", "correo", "direccion", "ciudad", "departamento", "contacto_emergencia_nombre", "contacto_emergencia_telefono", "contacto_emergencia_parentesco"]

    def validate_telefono(self, value):
        return validate_phone(value)

    def validate_contacto_emergencia_telefono(self, value):
        return validate_phone(value)


class PatientAppointmentRequestSerializer(serializers.Serializer):
    doctor = serializers.PrimaryKeyRelatedField(queryset=DoctorProfile.objects.filter(activo=True))
    scheduled_date = serializers.DateField()
    start_time = serializers.TimeField()
    modality = serializers.ChoiceField(
        choices=Appointment.Modality.choices,
        default=Appointment.Modality.PRESENCIAL,
        error_messages={"invalid_choice": "Selecciona una modalidad válida."},
    )
    reason = serializers.CharField(max_length=250, min_length=5, trim_whitespace=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class PatientAppointmentCancelSerializer(serializers.Serializer):
    reason = serializers.CharField(min_length=5, max_length=500, trim_whitespace=True)


class PatientAppointmentRescheduleSerializer(serializers.Serializer):
    scheduled_date = serializers.DateField()
    start_time = serializers.TimeField()
    reason = serializers.CharField(min_length=5, max_length=500, trim_whitespace=True)


class PatientPortalDoctorSerializer(serializers.ModelSerializer):
    user_nombre = serializers.CharField(source="user.nombre_completo", read_only=True)
    specialty_nombre = serializers.CharField(source="specialty.nombre", read_only=True)

    class Meta:
        model = DoctorProfile
        fields = ["id", "user_nombre", "specialty", "specialty_nombre", "numero_colegiacion", "titulo_profesional", "tarifa_consulta", "duracion_consulta_minutos", "atiende_virtual", "atiende_presencial"]


class PatientPortalSpecialtySerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicalSpecialty
        fields = ["id", "nombre", "descripcion"]


class MedicalRecordSummarySerializer(serializers.Serializer):
    record_number = serializers.CharField()
    blood_type = serializers.CharField()
    allergies = serializers.CharField()
    chronic_diseases = serializers.CharField()
    surgical_history = serializers.CharField()
    family_history = serializers.CharField()
    current_medications = serializers.CharField()
    consultations = serializers.ListField()
    diagnoses = serializers.ListField()
    prescriptions = serializers.ListField()
    medical_orders = serializers.ListField()


class PatientPortalDashboardSerializer(serializers.Serializer):
    patient = PatientPortalProfileSerializer()
    upcoming_appointments = PatientPortalAppointmentSerializer(many=True)
    recent_prescriptions = PatientPortalPrescriptionSerializer(many=True)
    recent_orders = PatientPortalMedicalOrderSerializer(many=True)
    pending_invoices = PatientPortalInvoiceListSerializer(many=True)
    pending_invoices_count = serializers.IntegerField()
    pending_balance = serializers.DecimalField(max_digits=14, decimal_places=2)
    last_payment = PatientPortalPaymentSerializer(allow_null=True)
    new_documents_count = serializers.IntegerField()
    unread_notifications = serializers.IntegerField()
    clinic = serializers.DictField()
    permissions = serializers.DictField()
    available_actions = serializers.DictField()
