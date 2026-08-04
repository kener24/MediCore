from datetime import datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from rest_framework import serializers

from apps.accounts.permissions import get_role_name
from apps.clinic_settings.models import get_or_create_clinic_settings, get_or_create_workflow_settings
from apps.appointments.models import Appointment
from apps.clinic_settings.utils import clinic_setting
from apps.doctors.models import DoctorProfile, DoctorSchedule
from apps.patients.models import Patient
from apps.subscriptions.services import ensure_can_create_appointment


class AppointmentListSerializer(serializers.ModelSerializer):
    clinic_nombre = serializers.CharField(source="clinic.nombre", read_only=True)
    patient_nombre = serializers.CharField(source="patient.nombre_completo", read_only=True)
    patient_codigo = serializers.CharField(source="patient.codigo_paciente", read_only=True)
    doctor_nombre = serializers.CharField(source="doctor.user.nombre_completo", read_only=True)
    specialty_nombre = serializers.CharField(source="doctor.specialty.nombre", read_only=True)
    specialty = serializers.IntegerField(source="doctor.specialty_id", read_only=True)
    patient_name = serializers.CharField(source="patient.nombre_completo", read_only=True)
    patient_code = serializers.CharField(source="patient.codigo_paciente", read_only=True)
    doctor_name = serializers.CharField(source="doctor.user.nombre_completo", read_only=True)
    doctor_specialty = serializers.CharField(source="doctor.specialty.nombre", read_only=True)
    created_by_nombre = serializers.CharField(source="created_by.nombre_completo", read_only=True)
    visit_id = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    duration_minutes = serializers.SerializerMethodField()
    can_cancel = serializers.SerializerMethodField()
    can_reschedule = serializers.SerializerMethodField()

    def get_visit_id(self, obj):
        visits = list(obj.visits.all())
        active = next((visit for visit in visits if visit.status in visit.ACTIVE_STATUSES), None)
        selected = active or (visits[0] if visits else None)
        return selected.id if selected else None

    def get_duration_minutes(self, obj):
        if not obj.scheduled_date or not obj.start_time or not obj.end_time:
            return None
        start = datetime.combine(obj.scheduled_date, obj.start_time)
        end = datetime.combine(obj.scheduled_date, obj.end_time)
        return int((end - start).total_seconds() // 60)

    def get_can_cancel(self, obj):
        if not obj.activo or obj.status not in [Appointment.Status.PENDIENTE, Appointment.Status.CONFIRMADA, Appointment.Status.REPROGRAMADA]:
            return False
        scheduled_at = timezone.make_aware(
            datetime.combine(obj.scheduled_date, obj.start_time),
            timezone.get_current_timezone(),
        )
        limits = getattr(self, "_cancellation_limits", None)
        if limits is None:
            limits = self._cancellation_limits = {}
        if obj.clinic_id not in limits:
            limits[obj.clinic_id] = get_or_create_clinic_settings(obj.clinic).cancellation_hours_limit
        cancellation_limit = limits[obj.clinic_id]
        return scheduled_at >= timezone.now() + timedelta(hours=cancellation_limit)

    def get_can_reschedule(self, obj):
        if not obj.activo or obj.status not in [Appointment.Status.PENDIENTE, Appointment.Status.CONFIRMADA, Appointment.Status.REPROGRAMADA]:
            return False
        scheduled_at = timezone.make_aware(
            datetime.combine(obj.scheduled_date, obj.start_time),
            timezone.get_current_timezone(),
        )
        return scheduled_at > timezone.now()

    class Meta:
        model = Appointment
        fields = [
            "id",
            "clinic",
            "clinic_nombre",
            "patient",
            "patient_nombre",
            "patient_codigo",
            "patient_name",
            "patient_code",
            "doctor",
            "doctor_nombre",
            "specialty_nombre",
            "specialty",
            "doctor_name",
            "doctor_specialty",
            "created_by",
            "created_by_nombre",
            "scheduled_date",
            "start_time",
            "end_time",
            "modality",
            "reason",
            "status",
            "status_display",
            "duration_minutes",
            "can_cancel",
            "can_reschedule",
            "activo",
            "creado_en",
            "actualizado_en",
            "visit_id",
        ]


class AppointmentDetailSerializer(AppointmentListSerializer):
    cancelled_by_nombre = serializers.CharField(source="cancelled_by.nombre_completo", read_only=True)

    class Meta(AppointmentListSerializer.Meta):
        fields = AppointmentListSerializer.Meta.fields + [
            "notes",
            "cancellation_reason",
            "cancelled_by",
            "cancelled_by_nombre",
            "cancelled_at",
            "confirmed_at",
            "attended_at",
            "last_reschedule_reason",
            "rescheduled_at",
        ]


class AppointmentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = ["id", "patient", "doctor", "scheduled_date", "start_time", "end_time", "modality", "reason", "notes", "status"]
        read_only_fields = ["id"]
        extra_kwargs = {"end_time": {"required": False}}

    def validate(self, attrs):
        request = self.context["request"]
        patient = attrs["patient"]
        doctor = attrs["doctor"]
        if patient.clinic_id != doctor.clinic_id:
            raise serializers.ValidationError("Paciente y medico deben pertenecer a la misma clinica.")
        role = get_role_name(request.user)
        if role not in ["admin", "enfermera", "recepcionista", "medico", "paciente"]:
            raise serializers.ValidationError("No tienes permiso para crear citas.")
        if role in ["admin", "enfermera", "recepcionista"] and request.user.clinica_id != doctor.clinic_id:
            raise serializers.ValidationError("No puedes crear citas fuera de tu clinica.")
        if role == "medico" and doctor.user_id != request.user.id:
            raise serializers.ValidationError("No puedes crear citas para otro medico.")
        if role == "paciente" and getattr(patient, "user_id", None) != request.user.id:
            raise serializers.ValidationError("No puedes crear citas para otro paciente.")
        workflow = get_or_create_workflow_settings(doctor.clinic)
        if not workflow.allow_appointments:
            raise serializers.ValidationError("La clínica no permite crear citas.")
        modality = attrs.get("modality", Appointment.Modality.PRESENCIAL)
        if modality == Appointment.Modality.ONLINE and not workflow.allow_online_appointments:
            raise serializers.ValidationError({"modality": "La clínica no tiene habilitadas las citas en línea."})
        if modality == Appointment.Modality.PRESENCIAL and not workflow.allow_in_person_appointments:
            raise serializers.ValidationError({"modality": "La clínica no tiene habilitadas las citas presenciales."})
        if role != "superadmin" and attrs["scheduled_date"] < timezone.localdate():
            raise serializers.ValidationError({"scheduled_date": "No puedes crear citas en fechas pasadas."})
        try:
            ensure_can_create_appointment(doctor.clinic)
        except ValueError as exc:
            raise serializers.ValidationError({"doctor": str(exc)})
        instance = Appointment(clinic=doctor.clinic, created_by=request.user, **attrs)
        try:
            instance.set_default_end_time()
            instance.clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages)
        attrs["clinic"] = doctor.clinic
        attrs["created_by"] = request.user
        attrs["end_time"] = instance.end_time
        return attrs


class AppointmentUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = ["patient", "doctor", "scheduled_date", "start_time", "end_time", "modality", "reason", "notes", "status"]
        extra_kwargs = {"end_time": {"required": False}}

    def validate(self, attrs):
        request = self.context["request"]
        role = get_role_name(request.user)
        if role not in ["admin", "recepcionista"]:
            raise serializers.ValidationError("No tienes permiso para editar citas.")
        if self.instance.status == Appointment.Status.ATENDIDA:
            raise serializers.ValidationError("No se puede modificar una cita atendida.")
        patient = attrs.get("patient", self.instance.patient)
        doctor = attrs.get("doctor", self.instance.doctor)
        if request.user.clinica_id != patient.clinic_id or request.user.clinica_id != doctor.clinic_id:
            raise serializers.ValidationError("No puedes editar una cita con recursos de otra clinica.")
        workflow = get_or_create_workflow_settings(doctor.clinic)
        if not workflow.allow_appointments:
            raise serializers.ValidationError("La clínica no permite modificar citas.")
        modality = attrs.get("modality", self.instance.modality)
        if modality == Appointment.Modality.ONLINE and not workflow.allow_online_appointments:
            raise serializers.ValidationError({"modality": "La clínica no tiene habilitadas las citas en línea."})
        if modality == Appointment.Modality.PRESENCIAL and not workflow.allow_in_person_appointments:
            raise serializers.ValidationError({"modality": "La clínica no tiene habilitadas las citas presenciales."})
        scheduled_date = attrs.get("scheduled_date", self.instance.scheduled_date)
        start_time = attrs.get("start_time", self.instance.start_time)
        end_time = attrs.get("end_time", self.instance.end_time)
        instance = Appointment(
            id=self.instance.id,
            clinic=doctor.clinic,
            patient=patient,
            doctor=doctor,
            created_by=self.instance.created_by,
            scheduled_date=scheduled_date,
            start_time=start_time,
            end_time=end_time,
            reason=attrs.get("reason", self.instance.reason),
            notes=attrs.get("notes", self.instance.notes),
            status=attrs.get("status", self.instance.status),
            modality=attrs.get("modality", self.instance.modality),
            activo=self.instance.activo,
        )
        try:
            instance.clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages)
        attrs["clinic"] = doctor.clinic
        return attrs


class AppointmentCancelSerializer(serializers.Serializer):
    cancellation_reason = serializers.CharField(required=False, allow_blank=True)


class AppointmentRescheduleSerializer(serializers.Serializer):
    scheduled_date = serializers.DateField()
    start_time = serializers.TimeField()
    end_time = serializers.TimeField(required=False)


class AppointmentStatsSerializer(serializers.Serializer):
    total_appointments = serializers.IntegerField()
    pending = serializers.IntegerField()
    confirmed = serializers.IntegerField()
    cancelled = serializers.IntegerField()
    attended = serializers.IntegerField()
    no_show = serializers.IntegerField()
    today = serializers.IntegerField()
    upcoming = serializers.IntegerField()


def build_availability(doctor: DoctorProfile, target_date, exclude_appointment_id=None):
    timezone_name = clinic_setting(doctor.clinic, "timezone", "America/Tegucigalpa")
    try:
        local_now = timezone.now().astimezone(ZoneInfo(timezone_name))
    except ZoneInfoNotFoundError:
        local_now = timezone.localtime()
    if target_date < local_now.date():
        return {"doctor": doctor.id, "date": target_date.isoformat(), "available_slots": [], "booked_slots": []}
    weekday = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"][target_date.weekday()]
    schedules = DoctorSchedule.objects.filter(doctor=doctor, dia_semana=weekday, activo=True)
    booked = Appointment.objects.filter(
        doctor=doctor,
        scheduled_date=target_date,
        activo=True,
        status__in=[Appointment.Status.PENDIENTE, Appointment.Status.CONFIRMADA, Appointment.Status.REPROGRAMADA],
    )
    if exclude_appointment_id:
        booked = booked.exclude(pk=exclude_appointment_id)
    booked_slots = [
        {"start_time": item.start_time.strftime("%H:%M"), "end_time": item.end_time.strftime("%H:%M"), "status": item.status}
        for item in booked
    ]
    available_slots = []
    duration = timedelta(minutes=clinic_setting(doctor.clinic, "appointment_duration_minutes", doctor.duracion_consulta_minutos))
    for schedule in schedules:
        cursor = datetime.combine(target_date, schedule.hora_inicio)
        end = datetime.combine(target_date, schedule.hora_fin)
        while cursor + duration <= end:
            slot_start = cursor.time()
            slot_end = (cursor + duration).time()
            if target_date == local_now.date() and cursor.replace(tzinfo=local_now.tzinfo) <= local_now:
                cursor += duration
                continue
            overlaps = booked.filter(start_time__lt=slot_end, end_time__gt=slot_start).exists()
            if not overlaps:
                available_slots.append({"start_time": slot_start.strftime("%H:%M"), "end_time": slot_end.strftime("%H:%M")})
            cursor += duration
    return {"doctor": doctor.id, "date": target_date.isoformat(), "available_slots": available_slots, "booked_slots": booked_slots}
