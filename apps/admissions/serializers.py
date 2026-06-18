from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.accounts.permissions import get_role_name
from apps.clinic_settings.models import get_or_create_workflow_settings
from apps.admissions.models import PatientVisit
from apps.appointments.models import Appointment
from apps.doctors.models import DoctorProfile
from apps.medical_records.models import ClinicalConsultation, MedicalRecord, VitalSigns
from apps.medical_records.serializers import VitalSignsSerializer
from apps.patients.models import Patient
from apps.patients.serializers import PatientCreateSerializer


def can_access_clinic(user, clinic_id):
    role = get_role_name(user)
    return bool(role != "superadmin" and not user.is_superuser and user.clinica_id and user.clinica_id == clinic_id)


class PatientVisitSerializer(serializers.ModelSerializer):
    clinic_nombre = serializers.CharField(source="clinic.nombre", read_only=True)
    patient_nombre = serializers.CharField(source="patient.nombre_completo", read_only=True)
    patient_codigo = serializers.CharField(source="patient.codigo_paciente", read_only=True)
    patient_identidad = serializers.CharField(source="patient.identidad", read_only=True)
    assigned_doctor_nombre = serializers.CharField(source="assigned_doctor.user.nombre_completo", read_only=True)
    assigned_nurse_nombre = serializers.CharField(source="assigned_nurse.nombre_completo", read_only=True)
    created_by_nombre = serializers.CharField(source="created_by.nombre_completo", read_only=True)
    vital_signs = serializers.SerializerMethodField()

    class Meta:
        model = PatientVisit
        fields = [
            "id",
            "clinic",
            "clinic_nombre",
            "patient",
            "patient_nombre",
            "patient_codigo",
            "patient_identidad",
            "appointment",
            "medical_record",
            "consultation",
            "invoice",
            "visit_number",
            "visit_date",
            "arrival_time",
            "triage_started_at",
            "triage_completed_at",
            "consultation_started_at",
            "consultation_completed_at",
            "billing_started_at",
            "completed_at",
            "cancelled_at",
            "checkout_at",
            "visit_type",
            "origin",
            "priority",
            "status",
            "reason",
            "symptoms",
            "notes",
            "cancellation_reason",
            "assigned_doctor",
            "assigned_doctor_nombre",
            "assigned_nurse",
            "assigned_nurse_nombre",
            "created_by",
            "created_by_nombre",
            "checked_in_by",
            "active",
            "vital_signs",
            "creado_en",
            "actualizado_en",
        ]
        read_only_fields = ["id", "clinic", "medical_record", "consultation", "invoice", "visit_number", "created_by", "checked_in_by", "active"]

    def get_vital_signs(self, obj):
        signs = VitalSigns.objects.filter(patient_visit=obj).order_by("-creado_en").first() if hasattr(VitalSigns, "patient_visit") else None
        return VitalSignsSerializer(signs).data if signs else None


class PatientVisitCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientVisit
        fields = ["id", "patient", "appointment", "visit_type", "priority", "reason", "symptoms", "notes", "assigned_doctor", "assigned_nurse", "status"]
        read_only_fields = ["id"]

    def validate(self, attrs):
        request = self.context["request"]
        role = get_role_name(request.user)
        if role not in ["admin", "recepcionista", "enfermera"]:
            raise serializers.ValidationError("No tienes permiso para registrar admisiones.")
        patient = attrs["patient"]
        if not can_access_clinic(request.user, patient.clinic_id):
            raise serializers.ValidationError("No tienes permiso sobre este paciente.")
        active_exists = PatientVisit.objects.filter(patient=patient, visit_date=timezone.localdate(), status__in=PatientVisit.ACTIVE_STATUSES).exists()
        if active_exists:
            raise serializers.ValidationError({"patient": "Este paciente ya tiene una atencion activa hoy."})
        appointment = attrs.get("appointment")
        if appointment:
            if appointment.patient_id != patient.id or appointment.clinic_id != patient.clinic_id:
                raise serializers.ValidationError({"appointment": "La cita debe pertenecer al paciente."})
            if appointment.status == Appointment.Status.CANCELADA:
                raise serializers.ValidationError({"appointment": "No puedes registrar llegada de una cita cancelada."})
            attrs["visit_type"] = PatientVisit.VisitType.APPOINTMENT
            attrs["assigned_doctor"] = attrs.get("assigned_doctor") or appointment.doctor
        doctor = attrs.get("assigned_doctor")
        if doctor and doctor.clinic_id != patient.clinic_id:
            raise serializers.ValidationError({"assigned_doctor": "El medico debe pertenecer a la misma clinica."})
        attrs["clinic"] = patient.clinic
        attrs["created_by"] = request.user
        attrs["checked_in_by"] = request.user
        attrs["medical_record"] = MedicalRecord.objects.get_or_create(patient=patient, defaults={"clinic": patient.clinic})[0]
        workflow = get_or_create_workflow_settings(patient.clinic)
        if attrs.get("status"):
            attrs["status"] = attrs["status"]
        elif attrs.get("visit_type") == PatientVisit.VisitType.APPOINTMENT:
            attrs["status"] = PatientVisit.Status.WAITING_TRIAGE if workflow.appointment_requires_triage else PatientVisit.Status.WAITING_DOCTOR
        else:
            attrs["status"] = PatientVisit.Status.WAITING_TRIAGE if workflow.walk_in_requires_triage else PatientVisit.Status.WAITING_DOCTOR
        return attrs


class WalkInRegistrationSerializer(serializers.Serializer):
    patient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all(), required=False, allow_null=True)
    patient_data = serializers.DictField(required=False)
    visit = serializers.DictField()

    def validate(self, attrs):
        request = self.context["request"]
        role = get_role_name(request.user)
        if role not in ["admin", "recepcionista", "enfermera"]:
            raise serializers.ValidationError("No tienes permiso para registrar atenciones.")
        patient = attrs.get("patient")
        patient_data = attrs.get("patient_data") or {}
        if not patient and not patient_data:
            raise serializers.ValidationError({"patient_data": "Datos del paciente requeridos."})
        if patient and not can_access_clinic(request.user, patient.clinic_id):
            raise serializers.ValidationError("No tienes permiso sobre este paciente.")
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        request = self.context["request"]
        patient = validated_data.get("patient")
        patient_data = validated_data.get("patient_data") or {}
        if not patient:
            clinic = request.user.clinica
            workflow = get_or_create_workflow_settings(clinic)
            if not workflow.allow_walk_in_patients:
                raise serializers.ValidationError("La clinica no permite pacientes sin cita.")
            if not workflow.reception_can_create_minimal_patient and get_role_name(request.user) == "recepcionista":
                raise serializers.ValidationError("Recepcion no puede crear pacientes basicos en esta clinica.")
            if workflow.require_identity_for_patient and not patient_data.get("identidad"):
                raise serializers.ValidationError({"identidad": "La identidad es obligatoria para esta clinica."})
            if workflow.require_phone_for_patient and not patient_data.get("telefono"):
                raise serializers.ValidationError({"telefono": "El telefono es obligatorio para esta clinica."})
            identity = patient_data.get("identidad")
            if identity:
                patient = Patient.objects.filter(clinic=clinic, identidad=identity).first()
            if not patient:
                serializer = PatientCreateSerializer(data=patient_data, context={"request": request})
                serializer.is_valid(raise_exception=True)
                patient = serializer.save()
        visit_data = validated_data["visit"]
        visit_serializer = PatientVisitCreateSerializer(data={**visit_data, "patient": patient.id, "visit_type": visit_data.get("visit_type", PatientVisit.VisitType.WALK_IN)}, context={"request": request})
        visit_serializer.is_valid(raise_exception=True)
        return visit_serializer.save()


class AppointmentCheckInSerializer(serializers.Serializer):
    appointment = serializers.PrimaryKeyRelatedField(queryset=Appointment.objects.select_related("clinic", "patient", "doctor"))
    priority = serializers.ChoiceField(choices=PatientVisit.Priority.choices, required=False, default=PatientVisit.Priority.NORMAL)
    symptoms = serializers.CharField(required=False, allow_blank=True)
    assigned_nurse = serializers.IntegerField(required=False, allow_null=True)

    def validate(self, attrs):
        appointment = attrs["appointment"]
        request = self.context["request"]
        if not can_access_clinic(request.user, appointment.clinic_id):
            raise serializers.ValidationError("No tienes permiso sobre esta cita.")
        workflow = get_or_create_workflow_settings(appointment.clinic)
        if not workflow.allow_appointments:
            raise serializers.ValidationError("La clinica no permite check-in de citas.")
        if appointment.status == Appointment.Status.CANCELADA:
            raise serializers.ValidationError({"appointment": "No puedes hacer check-in de una cita cancelada."})
        if PatientVisit.objects.filter(appointment=appointment, status__in=PatientVisit.ACTIVE_STATUSES).exists():
            raise serializers.ValidationError({"appointment": "Esta cita ya tiene una atencion activa."})
        return attrs


class VisitVitalSignsSerializer(VitalSignsSerializer):
    pain_scale = serializers.IntegerField(required=False, min_value=0, max_value=10, write_only=True)

    class Meta(VitalSignsSerializer.Meta):
        fields = VitalSignsSerializer.Meta.fields + ["patient_visit", "pain_scale", "recorded_at"]
        read_only_fields = VitalSignsSerializer.Meta.read_only_fields + ["patient_visit", "recorded_at"]
