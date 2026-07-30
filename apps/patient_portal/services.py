from datetime import datetime

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.appointments.models import Appointment
from apps.appointments.serializers import build_availability
from apps.clinic_settings.models import get_or_create_workflow_settings
from apps.doctors.models import DoctorProfile
from apps.patients.models import Patient
from apps.subscriptions.services import ensure_can_create_appointment


class PatientPortalAppointmentError(Exception):
    def __init__(self, detail, *, status_code=400, field=None):
        super().__init__(str(detail))
        self.detail = detail
        self.status_code = status_code
        self.field = field

    def payload(self):
        return {self.field: [self.detail]} if self.field else {"detail": self.detail}


def request_idempotency_key(request):
    value = request.headers.get("Idempotency-Key") or request.data.get("idempotency_key") or ""
    return str(value).strip()[:100] or None


def _validation_message(exc):
    if hasattr(exc, "message_dict"):
        first = next(iter(exc.message_dict.values()), ["Revisa la información ingresada."])
        return first[0] if isinstance(first, list) else str(first)
    messages = getattr(exc, "messages", None) or [str(exc)]
    return messages[0]


def _validate_doctor_and_modality(*, patient, doctor, modality, workflow):
    if doctor.clinic_id != patient.clinic_id or not doctor.activo:
        raise PatientPortalAppointmentError("El médico no está disponible en tu clínica.", field="doctor")
    if not getattr(doctor.user, "is_active", False):
        raise PatientPortalAppointmentError("El médico seleccionado no está activo.", field="doctor")
    if not workflow.allow_appointments:
        raise PatientPortalAppointmentError("La clínica no tiene habilitada la solicitud de citas.", status_code=403)
    if modality == Appointment.Modality.ONLINE:
        if not workflow.allow_online_appointments or not doctor.atiende_virtual:
            raise PatientPortalAppointmentError(
                "Esta clínica o el médico no tienen habilitadas las citas en línea. Puedes solicitar una cita presencial.",
                field="modality",
            )
    elif not workflow.allow_in_person_appointments or not doctor.atiende_presencial:
        raise PatientPortalAppointmentError("El médico no tiene habilitadas las citas presenciales.", field="modality")


def _available_slot(*, doctor, scheduled_date, start_time, exclude_appointment_id=None):
    availability = build_availability(doctor, scheduled_date, exclude_appointment_id=exclude_appointment_id)
    start_text = start_time.strftime("%H:%M")
    return next((item for item in availability["available_slots"] if item["start_time"] == start_text), None)


def _same_request(appointment, validated_data):
    return (
        appointment.doctor_id == validated_data["doctor"].id
        and appointment.scheduled_date == validated_data["scheduled_date"]
        and appointment.start_time.strftime("%H:%M") == validated_data["start_time"].strftime("%H:%M")
        and appointment.modality == validated_data.get("modality", Appointment.Modality.PRESENCIAL)
    )


def create_patient_appointment(*, patient, user, validated_data, idempotency_key=None):
    with transaction.atomic():
        locked_patient = Patient.objects.select_for_update().select_related("clinic").get(pk=patient.pk)
        if not locked_patient.activo or not locked_patient.clinic.activo:
            raise PatientPortalAppointmentError("Tu perfil o clínica no están activos.", status_code=403)

        if idempotency_key:
            existing = Appointment.objects.filter(
                clinic=locked_patient.clinic,
                patient=locked_patient,
                request_idempotency_key=idempotency_key,
            ).select_related("clinic", "patient", "doctor__user", "doctor__specialty").first()
            if existing:
                if not _same_request(existing, validated_data):
                    raise PatientPortalAppointmentError(
                        "La clave de idempotencia ya fue utilizada para otra solicitud.", status_code=409
                    )
                existing._idempotent_replay = True
                return existing

        doctor = DoctorProfile.objects.select_for_update().select_related("clinic", "user", "specialty").get(
            pk=validated_data["doctor"].pk
        )
        workflow = get_or_create_workflow_settings(locked_patient.clinic)
        modality = validated_data.get("modality", Appointment.Modality.PRESENCIAL)
        _validate_doctor_and_modality(patient=locked_patient, doctor=doctor, modality=modality, workflow=workflow)

        scheduled_date = validated_data["scheduled_date"]
        if scheduled_date < timezone.localdate():
            raise PatientPortalAppointmentError("La fecha de la cita no puede estar en el pasado.", field="scheduled_date")
        try:
            ensure_can_create_appointment(locked_patient.clinic)
        except ValueError as exc:
            raise PatientPortalAppointmentError(str(exc), status_code=403) from exc

        slot = _available_slot(
            doctor=doctor,
            scheduled_date=scheduled_date,
            start_time=validated_data["start_time"],
        )
        if not slot:
            raise PatientPortalAppointmentError(
                "El horario seleccionado ya no está disponible. Selecciona otro.", status_code=409
            )

        appointment = Appointment(
            clinic=locked_patient.clinic,
            patient=locked_patient,
            doctor=doctor,
            scheduled_date=scheduled_date,
            start_time=validated_data["start_time"],
            end_time=datetime.strptime(slot["end_time"], "%H:%M").time(),
            modality=modality,
            reason=validated_data["reason"].strip(),
            notes=validated_data.get("notes", "").strip(),
            status=Appointment.Status.PENDIENTE,
            created_by=user,
            request_idempotency_key=idempotency_key,
        )
        try:
            appointment.save()
        except IntegrityError:
            if idempotency_key:
                existing = Appointment.objects.filter(
                    clinic=locked_patient.clinic,
                    patient=locked_patient,
                    request_idempotency_key=idempotency_key,
                ).first()
                if existing:
                    existing._idempotent_replay = True
                    return existing
            raise PatientPortalAppointmentError(
                "El horario seleccionado ya no está disponible. Selecciona otro.", status_code=409
            )
        except DjangoValidationError as exc:
            raise PatientPortalAppointmentError(_validation_message(exc), status_code=409) from exc
        appointment._idempotent_replay = False
        return appointment


def reschedule_patient_appointment(*, appointment_id, patient, user, validated_data, idempotency_key=None):
    with transaction.atomic():
        appointment = (
            Appointment.objects.select_for_update()
            .select_related("clinic", "patient", "doctor__user", "doctor__specialty")
            .filter(pk=appointment_id, patient=patient, clinic=patient.clinic)
            .first()
        )
        if not appointment:
            raise PatientPortalAppointmentError("Cita no encontrada.", status_code=404)

        if idempotency_key and appointment.last_reschedule_idempotency_key == idempotency_key:
            same_target = (
                appointment.scheduled_date == validated_data["scheduled_date"]
                and appointment.start_time.strftime("%H:%M") == validated_data["start_time"].strftime("%H:%M")
            )
            if not same_target:
                raise PatientPortalAppointmentError(
                    "La clave de idempotencia ya fue utilizada para otra reprogramación.", status_code=409
                )
            appointment._idempotent_replay = True
            return appointment, None

        allowed = {Appointment.Status.PENDIENTE, Appointment.Status.CONFIRMADA, Appointment.Status.REPROGRAMADA}
        if appointment.status not in allowed or not appointment.activo:
            raise PatientPortalAppointmentError("Esta cita ya no puede reprogramarse desde el portal.", status_code=409)

        doctor = DoctorProfile.objects.select_for_update().select_related("clinic", "user", "specialty").get(
            pk=appointment.doctor_id
        )
        workflow = get_or_create_workflow_settings(patient.clinic)
        _validate_doctor_and_modality(
            patient=patient,
            doctor=doctor,
            modality=appointment.modality,
            workflow=workflow,
        )
        scheduled_date = validated_data["scheduled_date"]
        if scheduled_date < timezone.localdate():
            raise PatientPortalAppointmentError("La nueva fecha no puede estar en el pasado.", field="scheduled_date")
        slot = _available_slot(
            doctor=doctor,
            scheduled_date=scheduled_date,
            start_time=validated_data["start_time"],
            exclude_appointment_id=appointment.id,
        )
        if not slot:
            raise PatientPortalAppointmentError(
                "El horario seleccionado ya no está disponible. Selecciona otro.", status_code=409
            )

        old_values = {
            "scheduled_date": appointment.scheduled_date,
            "start_time": appointment.start_time,
            "end_time": appointment.end_time,
            "status": appointment.status,
        }
        appointment.scheduled_date = scheduled_date
        appointment.start_time = validated_data["start_time"]
        appointment.end_time = datetime.strptime(slot["end_time"], "%H:%M").time()
        appointment.status = Appointment.Status.REPROGRAMADA
        appointment.last_reschedule_reason = validated_data["reason"].strip()
        appointment.last_reschedule_idempotency_key = idempotency_key or ""
        appointment.rescheduled_at = timezone.now()
        appointment.rescheduled_by = user
        try:
            appointment.save()
        except DjangoValidationError as exc:
            raise PatientPortalAppointmentError(_validation_message(exc), status_code=409) from exc
        appointment._idempotent_replay = False
        return appointment, old_values
