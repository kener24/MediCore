from rest_framework import serializers

from apps.hospitalization.models import (
    HospitalBed,
    HospitalBedAssignment,
    HospitalRoom,
    HospitalVitalSigns,
    Hospitalization,
    HospitalizationEvent,
    NursingNote,
)


class HospitalRoomSerializer(serializers.ModelSerializer):
    clinic_nombre = serializers.CharField(source="clinic.nombre", read_only=True)
    beds_count = serializers.IntegerField(read_only=True)
    occupied_beds = serializers.IntegerField(read_only=True)

    class Meta:
        model = HospitalRoom
        fields = [
            "id",
            "clinic",
            "clinic_nombre",
            "name",
            "room_number",
            "floor",
            "room_type",
            "description",
            "is_active",
            "beds_count",
            "occupied_beds",
            "creado_en",
            "actualizado_en",
        ]
        read_only_fields = ["clinic", "creado_en", "actualizado_en"]


class HospitalBedSerializer(serializers.ModelSerializer):
    clinic_nombre = serializers.CharField(source="clinic.nombre", read_only=True)
    room_name = serializers.CharField(source="room.name", read_only=True)
    room_number = serializers.CharField(source="room.room_number", read_only=True)
    current_patient = serializers.SerializerMethodField()
    current_hospitalization = serializers.SerializerMethodField()

    class Meta:
        model = HospitalBed
        fields = [
            "id",
            "clinic",
            "clinic_nombre",
            "room",
            "room_name",
            "room_number",
            "bed_number",
            "bed_code",
            "status",
            "is_active",
            "notes",
            "current_patient",
            "current_hospitalization",
            "creado_en",
            "actualizado_en",
        ]
        read_only_fields = ["clinic", "bed_code", "current_patient", "current_hospitalization", "creado_en", "actualizado_en"]

    def get_current_hospitalization(self, obj):
        active = obj.active_hospitalizations.filter(status__in=Hospitalization.ACTIVE_STATUSES).first()
        return active.id if active else None

    def get_current_patient(self, obj):
        active = obj.active_hospitalizations.select_related("patient").filter(status__in=Hospitalization.ACTIVE_STATUSES).first()
        return active.patient.nombre_completo if active else ""


class HospitalBedAssignmentSerializer(serializers.ModelSerializer):
    bed_code = serializers.CharField(source="bed.bed_code", read_only=True)
    assigned_by_name = serializers.CharField(source="assigned_by.nombre_completo", read_only=True)

    class Meta:
        model = HospitalBedAssignment
        fields = ["id", "bed", "bed_code", "assigned_by", "assigned_by_name", "assigned_at", "released_at", "release_reason", "notes"]
        read_only_fields = ["assigned_by", "assigned_at", "released_at"]


class HospitalVitalSignsSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.CharField(source="recorded_by.nombre_completo", read_only=True)

    class Meta:
        model = HospitalVitalSigns
        fields = [
            "id",
            "hospitalization",
            "temperature",
            "blood_pressure_systolic",
            "blood_pressure_diastolic",
            "heart_rate",
            "respiratory_rate",
            "oxygen_saturation",
            "weight",
            "height",
            "bmi",
            "glucose",
            "pain_scale",
            "notes",
            "recorded_by",
            "recorded_by_name",
            "recorded_at",
            "creado_en",
        ]
        read_only_fields = ["hospitalization", "bmi", "recorded_by", "recorded_at", "creado_en"]


class NursingNoteSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.nombre_completo", read_only=True)

    class Meta:
        model = NursingNote
        fields = ["id", "hospitalization", "note_type", "title", "note", "created_by", "created_by_name", "recorded_at", "creado_en"]
        read_only_fields = ["hospitalization", "created_by", "recorded_at", "creado_en"]


class HospitalizationListSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.nombre_completo", read_only=True)
    patient_code = serializers.CharField(source="patient.codigo_paciente", read_only=True)
    responsible_doctor_name = serializers.CharField(source="responsible_doctor.user.nombre_completo", read_only=True)
    current_bed_code = serializers.CharField(source="current_bed.bed_code", read_only=True)
    current_room = serializers.CharField(source="current_bed.room.name", read_only=True)
    admitted_by_name = serializers.CharField(source="admitted_by.nombre_completo", read_only=True)

    class Meta:
        model = Hospitalization
        fields = [
            "id",
            "clinic",
            "patient",
            "patient_name",
            "patient_code",
            "visit",
            "consultation",
            "admission_source",
            "responsible_doctor",
            "responsible_doctor_name",
            "current_bed",
            "current_bed_code",
            "current_room",
            "status",
            "reason",
            "diagnosis_at_admission",
            "admission_datetime",
            "discharge_datetime",
            "admitted_by_name",
        ]
        read_only_fields = ["clinic"]


class HospitalizationDetailSerializer(HospitalizationListSerializer):
    bed_assignments = HospitalBedAssignmentSerializer(many=True, read_only=True)
    recent_vital_signs = serializers.SerializerMethodField()
    recent_nursing_notes = serializers.SerializerMethodField()
    events = serializers.SerializerMethodField()

    class Meta(HospitalizationListSerializer.Meta):
        fields = HospitalizationListSerializer.Meta.fields + [
            "admitted_by",
            "discharged_by",
            "discharge_reason",
            "discharge_notes",
            "transfer_notes",
            "bed_assignments",
            "recent_vital_signs",
            "recent_nursing_notes",
            "events",
            "creado_en",
            "actualizado_en",
        ]
        read_only_fields = HospitalizationListSerializer.Meta.read_only_fields + ["admitted_by", "discharged_by", "creado_en", "actualizado_en"]

    def get_recent_vital_signs(self, obj):
        return HospitalVitalSignsSerializer(obj.vital_signs.all()[:5], many=True).data

    def get_recent_nursing_notes(self, obj):
        return NursingNoteSerializer(obj.nursing_notes.all()[:5], many=True).data

    def get_events(self, obj):
        return HospitalizationEventSerializer(obj.events.all()[:10], many=True).data


class HospitalizationCreateSerializer(serializers.ModelSerializer):
    bed = serializers.PrimaryKeyRelatedField(queryset=HospitalBed.objects.all(), required=False, allow_null=True, write_only=True)

    class Meta:
        model = Hospitalization
        fields = [
            "patient",
            "visit",
            "consultation",
            "admission_source",
            "responsible_doctor",
            "bed",
            "status",
            "reason",
            "diagnosis_at_admission",
            "admission_datetime",
        ]


class BedActionSerializer(serializers.Serializer):
    bed = serializers.PrimaryKeyRelatedField(queryset=HospitalBed.objects.all())
    notes = serializers.CharField(required=False, allow_blank=True)


class DischargeSerializer(serializers.Serializer):
    discharge_reason = serializers.CharField(required=False, allow_blank=True)
    discharge_notes = serializers.CharField(required=False, allow_blank=True)
    bed_status = serializers.ChoiceField(choices=[HospitalBed.Status.CLEANING, HospitalBed.Status.AVAILABLE], default=HospitalBed.Status.CLEANING)


class CancelHospitalizationSerializer(serializers.Serializer):
    reason = serializers.CharField()


class HospitalizationEventSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.nombre_completo", read_only=True)

    class Meta:
        model = HospitalizationEvent
        fields = ["id", "event_type", "description", "created_by", "created_by_name", "metadata", "creado_en"]
        read_only_fields = fields
