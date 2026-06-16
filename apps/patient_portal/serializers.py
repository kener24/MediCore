from rest_framework import serializers

from apps.appointments.serializers import AppointmentDetailSerializer, AppointmentListSerializer
from apps.appointments.models import Appointment
from apps.billing.serializers import InvoiceDetailSerializer, InvoiceListSerializer, PaymentListSerializer
from apps.core.validators import validate_phone
from apps.doctors.models import DoctorProfile, MedicalSpecialty
from apps.medical_records.models import ClinicalConsultation, MedicalRecord
from apps.patients.models import Patient
from apps.prescriptions.serializers import MedicalOrderDetailSerializer, MedicalOrderListSerializer, PrescriptionDetailSerializer, PrescriptionListSerializer


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
    reason = serializers.CharField(max_length=250)
    notes = serializers.CharField(required=False, allow_blank=True)


class PatientAppointmentCancelSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True)


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
    upcoming_appointments = AppointmentListSerializer(many=True)
    recent_prescriptions = PrescriptionListSerializer(many=True)
    pending_invoices = InvoiceListSerializer(many=True)
    unread_notifications = serializers.IntegerField()
    clinic = serializers.DictField()
    permissions = serializers.DictField()
