from rest_framework import serializers

from apps.appointments.serializers import AppointmentDetailSerializer
from apps.appointments.models import Appointment
from apps.billing.serializers import InvoiceDetailSerializer, InvoiceListSerializer, PaymentListSerializer
from apps.core.validators import validate_phone
from apps.doctors.models import DoctorProfile, MedicalSpecialty
from apps.medical_records.models import ClinicalConsultation, MedicalRecord
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
    pending_invoices = InvoiceListSerializer(many=True)
    new_documents_count = serializers.IntegerField()
    unread_notifications = serializers.IntegerField()
    clinic = serializers.DictField()
    permissions = serializers.DictField()
    available_actions = serializers.DictField()
