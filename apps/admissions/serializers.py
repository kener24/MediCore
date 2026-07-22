from django.db import transaction
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from apps.accounts.permissions import get_role_name
from apps.accounts.models import User
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
        read_only_fields = [
            "id", "clinic", "patient", "appointment", "medical_record", "consultation", "invoice", "visit_number",
            "visit_date", "arrival_time", "triage_started_at", "triage_completed_at", "consultation_started_at",
            "consultation_completed_at", "billing_started_at", "completed_at", "cancelled_at", "checkout_at",
            "visit_type", "origin", "priority", "status", "reason", "symptoms", "cancellation_reason",
            "assigned_doctor", "assigned_nurse", "created_by", "checked_in_by", "active",
        ]

    def validate(self, attrs):
        if self.instance:
            attempted = set(self.initial_data) - {"notes"}
            if attempted:
                raise serializers.ValidationError({"detail": "Los estados y datos clínicos de la visita solo cambian mediante sus acciones autorizadas."})
        return attrs

    def get_vital_signs(self, obj):
        signs = VitalSigns.objects.filter(patient_visit=obj).order_by("-creado_en").first() if hasattr(VitalSigns, "patient_visit") else None
        return VitalSignsSerializer(signs).data if signs else None


class PatientVisitCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientVisit
        fields = ["id", "patient", "visit_type", "priority", "reason", "symptoms", "notes", "assigned_doctor", "assigned_nurse"]
        read_only_fields = ["id"]

    def validate(self, attrs):
        request = self.context["request"]
        role = get_role_name(request.user)
        if role not in ["admin", "recepcionista"]:
            raise serializers.ValidationError("No tienes permiso para registrar admisiones.")
        patient = attrs["patient"]
        if not can_access_clinic(request.user, patient.clinic_id):
            raise serializers.ValidationError("No tienes permiso sobre este paciente.")
        workflow = get_or_create_workflow_settings(patient.clinic)
        if not workflow.allow_walk_in_patients:
            raise serializers.ValidationError("La clínica no permite admisiones sin cita.")
        if attrs.get("visit_type") == PatientVisit.VisitType.APPOINTMENT:
            raise serializers.ValidationError({"visit_type": "Usa la acción de check-in para registrar una visita con cita."})
        doctor = attrs.get("assigned_doctor")
        if doctor and doctor.clinic_id != patient.clinic_id:
            raise serializers.ValidationError({"assigned_doctor": "El medico debe pertenecer a la misma clinica."})
        return attrs

    def create(self, validated_data):
        from apps.clinic_flow import services as flow

        request = self.context["request"]
        patient = validated_data.pop("patient")
        reason = validated_data.pop("reason")
        try:
            return flow.create_walk_in_visit(patient=patient, reason=reason, user=request.user, request=request, **validated_data)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"detail": exc.messages[0]}) from exc


class WalkInRegistrationSerializer(serializers.Serializer):
    patient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all(), required=False, allow_null=True)
    patient_data = serializers.DictField(required=False)
    visit = serializers.DictField()

    def validate(self, attrs):
        request = self.context["request"]
        role = get_role_name(request.user)
        if role not in ["admin", "recepcionista"]:
            raise serializers.ValidationError("No tienes permiso para registrar atenciones.")
        patient = attrs.get("patient")
        patient_data = attrs.get("patient_data") or {}
        if not patient and not patient_data:
            raise serializers.ValidationError({"patient_data": "Datos del paciente requeridos."})
        if patient and not can_access_clinic(request.user, patient.clinic_id):
            raise serializers.ValidationError("No tienes permiso sobre este paciente.")
        workflow = get_or_create_workflow_settings(request.user.clinica)
        if not workflow.allow_walk_in_patients:
            raise serializers.ValidationError("La clínica no permite admisiones sin cita.")
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
    assigned_nurse = serializers.PrimaryKeyRelatedField(queryset=User.objects.select_related("role", "clinica"), required=False, allow_null=True)

    def validate(self, attrs):
        appointment = attrs["appointment"]
        request = self.context["request"]
        if get_role_name(request.user) not in ["admin", "recepcionista"]:
            raise serializers.ValidationError("No tienes permiso para hacer check-in.")
        if not can_access_clinic(request.user, appointment.clinic_id):
            raise serializers.ValidationError("No tienes permiso sobre esta cita.")
        workflow = get_or_create_workflow_settings(appointment.clinic)
        if not workflow.allow_appointments:
            raise serializers.ValidationError("La clinica no permite check-in de citas.")
        allowed_statuses = [Appointment.Status.PENDIENTE, Appointment.Status.CONFIRMADA, Appointment.Status.REPROGRAMADA]
        existing = PatientVisit.objects.filter(appointment=appointment).first()
        if appointment.status not in allowed_statuses and not (existing and existing.status in PatientVisit.ACTIVE_STATUSES):
            raise serializers.ValidationError({"appointment": "La cita no se encuentra en un estado válido para check-in."})
        nurse = attrs.get("assigned_nurse")
        if nurse and (get_role_name(nurse) != "enfermera" or nurse.clinica_id != appointment.clinic_id):
            raise serializers.ValidationError({"assigned_nurse": "Selecciona una enfermera de la misma clínica."})
        return attrs


class VisitVitalSignsSerializer(VitalSignsSerializer):
    pain_scale = serializers.IntegerField(required=False, min_value=0, max_value=10, write_only=True)

    class Meta(VitalSignsSerializer.Meta):
        fields = VitalSignsSerializer.Meta.fields + ["patient_visit", "pain_scale", "recorded_at"]
        read_only_fields = VitalSignsSerializer.Meta.read_only_fields + ["patient_visit", "recorded_at"]
