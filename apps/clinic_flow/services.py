from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.accounts.permissions import get_role_name
from apps.admissions.models import PatientVisit
from apps.audit.models import AuditLog
from apps.audit.services import log_audit_event
from apps.billing.models import Invoice
from apps.clinic_settings.models import get_or_create_workflow_settings
from apps.medical_records.models import ClinicalConsultation, MedicalRecord, VitalSigns


RECEPTION_ROLES = {"admin", "recepcionista"}
TRIAGE_ROLES = {"admin", "enfermera"}
DOCTOR_ROLES = {"medico"}
CASHIER_ROLES = {"admin", "recepcionista", "cajero", "recepcionista_caja"}


def _role(user):
    return get_role_name(user)


def _assert_role(user, allowed, message):
    if _role(user) not in allowed:
        raise ValidationError(message)


def _assert_clinic(user, clinic):
    if not getattr(user, "clinica_id", None) or user.clinica_id != clinic.id:
        raise ValidationError("No tienes permiso sobre esta clinica.")


def _audit(request, visit, action, description, old_status=None, new_values=None):
    values = {"status": visit.status}
    values.update(new_values or {})
    log_audit_event(
        request=request,
        clinic=visit.clinic,
        action=action,
        module=AuditLog.Module.ADMISSIONS,
        model_name="PatientVisit",
        object_id=visit.id,
        object_repr=visit.visit_number,
        description=description,
        old_values={"status": old_status} if old_status else {},
        new_values=values,
    )


def next_entry_status(clinic, visit_type):
    workflow = get_or_create_workflow_settings(clinic)
    if visit_type == PatientVisit.VisitType.APPOINTMENT:
        return PatientVisit.Status.WAITING_TRIAGE if workflow.appointment_requires_triage else PatientVisit.Status.WAITING_DOCTOR
    return PatientVisit.Status.WAITING_TRIAGE if workflow.walk_in_requires_triage else PatientVisit.Status.WAITING_DOCTOR


def _requires_triage(visit):
    workflow = get_or_create_workflow_settings(visit.clinic)
    if visit.visit_type == PatientVisit.VisitType.APPOINTMENT:
        return workflow.appointment_requires_triage
    return workflow.walk_in_requires_triage


@transaction.atomic
def create_walk_in_visit(*, patient, reason, user, request=None, visit_type=PatientVisit.VisitType.WALK_IN, **extra):
    _assert_role(user, RECEPTION_ROLES, "No tienes permiso para registrar pacientes sin cita.")
    patient = type(patient).objects.select_for_update().select_related("clinic").get(pk=patient.pk)
    _assert_clinic(user, patient.clinic)
    workflow = get_or_create_workflow_settings(patient.clinic)
    if not workflow.allow_walk_in_patients:
        raise ValidationError("La clinica no permite pacientes sin cita.")
    if PatientVisit.objects.filter(patient=patient, visit_date=timezone.localdate(), status__in=PatientVisit.ACTIVE_STATUSES).exists():
        raise ValidationError("Este paciente ya tiene una visita activa hoy.")
    record, _ = MedicalRecord.objects.get_or_create(patient=patient, defaults={"clinic": patient.clinic})
    initial_status = next_entry_status(patient.clinic, visit_type)
    if initial_status == PatientVisit.Status.WAITING_DOCTOR and not extra.get("assigned_doctor"):
        raise ValidationError("Asigna un médico porque esta clínica envía la admisión directamente a consulta.")
    visit = PatientVisit.objects.create(
        clinic=patient.clinic,
        patient=patient,
        medical_record=record,
        visit_type=visit_type,
        origin=PatientVisit.Origin.RECEPTION,
        reason=reason,
        status=initial_status,
        created_by=user,
        checked_in_by=user,
        **extra,
    )
    _audit(request, visit, AuditLog.Action.CREATE, "Admision sin cita creada.")
    return visit


@transaction.atomic
def check_in_appointment(*, appointment, user, request=None, priority=PatientVisit.Priority.NORMAL, symptoms="", assigned_nurse=None):
    _assert_role(user, RECEPTION_ROLES, "No tienes permiso para hacer check-in.")
    appointment = type(appointment).objects.select_for_update().select_related("clinic", "patient", "doctor").get(pk=appointment.pk)
    _assert_clinic(user, appointment.clinic)
    workflow = get_or_create_workflow_settings(appointment.clinic)
    if not workflow.allow_appointments:
        raise ValidationError("La clinica no permite citas.")
    existing = PatientVisit.objects.select_for_update().filter(appointment=appointment).order_by("id").first()
    if existing:
        if existing.status in PatientVisit.ACTIVE_STATUSES:
            return existing, False
        raise ValidationError("La cita ya tiene una visita registrada y no puede generar otra.")
    allowed_statuses = [appointment.Status.PENDIENTE, appointment.Status.CONFIRMADA, appointment.Status.REPROGRAMADA]
    if appointment.status not in allowed_statuses:
        raise ValidationError("La cita no se encuentra en un estado válido para check-in.")
    if assigned_nurse and assigned_nurse.clinica_id != appointment.clinic_id:
        raise ValidationError("La enfermera asignada debe pertenecer a la misma clínica.")
    record, _ = MedicalRecord.objects.get_or_create(patient=appointment.patient, defaults={"clinic": appointment.clinic})
    visit = PatientVisit.objects.create(
        clinic=appointment.clinic,
        patient=appointment.patient,
        appointment=appointment,
        medical_record=record,
        visit_type=PatientVisit.VisitType.APPOINTMENT,
        origin=PatientVisit.Origin.RECEPTION,
        priority=priority,
        reason=appointment.reason,
        symptoms=symptoms,
        assigned_doctor=appointment.doctor,
        assigned_nurse=assigned_nurse,
        created_by=user,
        checked_in_by=user,
        status=next_entry_status(appointment.clinic, PatientVisit.VisitType.APPOINTMENT),
    )
    appointment.status = appointment.Status.CONFIRMADA
    appointment.confirmed_at = appointment.confirmed_at or timezone.now()
    appointment.save(update_fields=["status", "confirmed_at"])
    _audit(request, visit, AuditLog.Action.CREATE, "Check-in de cita registrado.")
    return visit, True


@transaction.atomic
def send_to_triage(visit, *, user, request=None):
    _assert_role(user, RECEPTION_ROLES | TRIAGE_ROLES, "No tienes permiso para enviar a triaje.")
    visit = PatientVisit.objects.select_for_update().select_related("clinic").get(pk=visit.pk)
    _assert_clinic(user, visit.clinic)
    if visit.status == PatientVisit.Status.WAITING_TRIAGE:
        return visit
    if visit.status not in [PatientVisit.Status.REGISTERED, PatientVisit.Status.WAITING_DOCTOR]:
        raise ValidationError("La visita no puede enviarse a triaje desde su estado actual.")
    old = visit.status
    visit.touch_status(PatientVisit.Status.WAITING_TRIAGE, user=user)
    _audit(request, visit, AuditLog.Action.UPDATE, "Paciente enviado a triaje.", old)
    return visit


@transaction.atomic
def start_triage(visit, *, user, request=None):
    _assert_role(user, TRIAGE_ROLES, "No tienes permiso para iniciar triaje.")
    visit = PatientVisit.objects.select_for_update().select_related("clinic", "assigned_nurse").get(pk=visit.pk)
    _assert_clinic(user, visit.clinic)
    if visit.status == PatientVisit.Status.IN_TRIAGE:
        if visit.assigned_nurse_id == user.id:
            return visit, False
        raise ValidationError("El triaje ya fue iniciado por otro usuario.")
    if visit.status != PatientVisit.Status.WAITING_TRIAGE:
        raise ValidationError("La visita no esta esperando triaje.")
    if not _requires_triage(visit):
        raise ValidationError("La configuracion de la clinica no requiere triaje para esta visita.")
    old = visit.status
    visit.touch_status(PatientVisit.Status.IN_TRIAGE, user=user)
    _audit(request, visit, AuditLog.Action.UPDATE, "Triaje iniciado.", old)
    return visit, True


@transaction.atomic
def record_vital_signs(visit, *, user, request=None, clinical_warnings=None, warning_confirmed=False, **data):
    _assert_role(user, TRIAGE_ROLES, "No tienes permiso para registrar signos vitales.")
    visit = PatientVisit.objects.select_for_update().select_related("clinic").get(pk=visit.pk)
    _assert_clinic(user, visit.clinic)
    if visit.status != PatientVisit.Status.IN_TRIAGE:
        raise ValidationError("Los signos vitales de triaje solo pueden registrarse durante un triaje activo.")

    signs = VitalSigns.objects.select_for_update().filter(patient_visit=visit).order_by("id").first()
    created = signs is None
    signs = signs or VitalSigns(patient_visit=visit)
    changed_fields = []
    for field, value in data.items():
        if hasattr(signs, field):
            setattr(signs, field, value)
            changed_fields.append(field)
    signs.registrado_por = user
    signs.recorded_at = timezone.now()
    signs.save()

    log_audit_event(
        request=request,
        clinic=visit.clinic,
        action=AuditLog.Action.CREATE if created else AuditLog.Action.UPDATE,
        module=AuditLog.Module.MEDICAL_RECORDS,
        model_name="VitalSigns",
        object_id=signs.id,
        object_repr=visit.visit_number,
        description="Signos vitales registrados." if created else "Signos vitales de triaje corregidos.",
        new_values={"visit": visit.id, "fields": sorted(changed_fields)},
    )
    if clinical_warnings and warning_confirmed:
        log_audit_event(
            request=request,
            clinic=visit.clinic,
            action=AuditLog.Action.UPDATE,
            module=AuditLog.Module.MEDICAL_RECORDS,
            model_name="VitalSigns",
            object_id=signs.id,
            object_repr=visit.visit_number,
            description="Advertencia de signos vitales confirmada por enfermeria.",
            new_values={"visit": visit.id, "warning_count": len(clinical_warnings)},
        )
    return signs, created


@transaction.atomic
def complete_triage(
    visit,
    *,
    user,
    chief_complaint,
    initial_assessment,
    priority,
    notes="",
    request=None,
):
    _assert_role(user, TRIAGE_ROLES, "No tienes permiso para finalizar triaje.")
    visit = PatientVisit.objects.select_for_update().select_related("clinic", "assigned_nurse").get(pk=visit.pk)
    _assert_clinic(user, visit.clinic)
    if visit.status == PatientVisit.Status.WAITING_DOCTOR and visit.triage_completed_at:
        return visit, False
    if visit.status != PatientVisit.Status.IN_TRIAGE:
        raise ValidationError("La visita no esta en triaje.")
    if _role(user) == "enfermera" and visit.assigned_nurse_id and visit.assigned_nurse_id != user.id:
        raise ValidationError("El triaje fue iniciado por otra enfermera.")
    if not visit.vital_signs.exists():
        raise ValidationError("Registra signos vitales antes de finalizar triaje.")
    old = visit.status
    visit.reason = chief_complaint
    visit.symptoms = initial_assessment
    visit.priority = priority
    visit.notes = notes
    visit.touch_status(PatientVisit.Status.WAITING_DOCTOR, user=user)
    _audit(request, visit, AuditLog.Action.FINALIZE, "Triaje finalizado.", old, {"priority": priority})
    return visit, True


@transaction.atomic
def send_to_doctor(visit, *, user, request=None):
    _assert_role(user, RECEPTION_ROLES | TRIAGE_ROLES, "No tienes permiso para enviar al medico.")
    visit = PatientVisit.objects.select_for_update().select_related("clinic", "assigned_doctor").get(pk=visit.pk)
    _assert_clinic(user, visit.clinic)
    if visit.status == PatientVisit.Status.WAITING_DOCTOR:
        return visit
    workflow = get_or_create_workflow_settings(visit.clinic)
    requires_triage = workflow.appointment_requires_triage if visit.visit_type == PatientVisit.VisitType.APPOINTMENT else workflow.walk_in_requires_triage
    if requires_triage:
        raise ValidationError("La configuración de la clínica exige completar triaje antes de enviar al médico.")
    if not visit.assigned_doctor_id:
        raise ValidationError("Asigna un médico antes de enviar la visita a la sala de espera.")
    if visit.status not in [PatientVisit.Status.REGISTERED, PatientVisit.Status.WAITING_TRIAGE]:
        raise ValidationError("La visita no puede enviarse al medico desde su estado actual.")
    old = visit.status
    visit.touch_status(PatientVisit.Status.WAITING_DOCTOR, user=user)
    _audit(request, visit, AuditLog.Action.UPDATE, "Paciente enviado al medico.", old)
    return visit


@transaction.atomic
def start_consultation(visit, *, user, request=None):
    _assert_role(user, DOCTOR_ROLES, "Solo medicos pueden iniciar consulta.")
    visit = PatientVisit.objects.select_for_update().select_related(
        "clinic", "patient", "medical_record", "appointment", "assigned_doctor__user", "consultation"
    ).get(pk=visit.pk)
    _assert_clinic(user, visit.clinic)
    if visit.status not in [PatientVisit.Status.WAITING_DOCTOR, PatientVisit.Status.IN_CONSULTATION]:
        raise ValidationError("La visita no esta esperando doctor.")
    if _requires_triage(visit) and not visit.triage_completed_at:
        raise ValidationError("Debes completar el triaje antes de iniciar la consulta.")
    if visit.assigned_doctor_id and visit.assigned_doctor.user_id != user.id:
        raise ValidationError("Esta visita esta asignada a otro medico.")
    doctor = visit.assigned_doctor or getattr(user, "doctor_profile", None)
    if not doctor:
        raise ValidationError("No hay medico asignado.")
    consultation = visit.consultation or ClinicalConsultation.objects.filter(patient_visit=visit).first()
    created = False
    if not consultation:
        try:
            with transaction.atomic():
                consultation = ClinicalConsultation.objects.create(
                    clinic=visit.clinic,
                    medical_record=visit.medical_record,
                    patient=visit.patient,
                    doctor=doctor,
                    appointment=visit.appointment,
                    patient_visit=visit,
                    consultation_date=visit.visit_date,
                    chief_complaint=visit.reason,
                    symptoms=visit.symptoms,
                    created_by=user,
                )
            created = True
        except IntegrityError:
            consultation = ClinicalConsultation.objects.get(patient_visit=visit)
    if consultation.doctor.user_id != user.id:
        raise ValidationError("Esta consulta pertenece a otro medico.")
    visit.consultation = consultation
    old = visit.status
    visit.assigned_doctor = doctor
    visit.touch_status(PatientVisit.Status.IN_CONSULTATION, user=user)
    visit.save(update_fields=["assigned_doctor", "consultation", "status", "consultation_started_at", "actualizado_en"])
    if created or old != PatientVisit.Status.IN_CONSULTATION:
        _audit(request, visit, AuditLog.Action.CREATE, "Consulta iniciada desde visita.", old, {"consultation": consultation.id})
    return visit, consultation, created


@transaction.atomic
def complete_consultation(visit, *, user, request=None):
    _assert_role(user, DOCTOR_ROLES, "Solo medicos pueden completar consulta.")
    visit = PatientVisit.objects.select_for_update().select_related("clinic", "consultation", "assigned_doctor__user").get(pk=visit.pk)
    _assert_clinic(user, visit.clinic)
    if visit.assigned_doctor_id and visit.assigned_doctor.user_id != user.id:
        raise ValidationError("Esta visita esta asignada a otro medico.")
    if not visit.consultation_id:
        raise ValidationError("La visita no tiene consulta iniciada.")
    if visit.consultation.status != ClinicalConsultation.Status.FINALIZADA:
        raise ValidationError("La consulta debe estar finalizada antes de cerrar atencion medica.")
    workflow = get_or_create_workflow_settings(visit.clinic)
    old = visit.status
    next_status = PatientVisit.Status.WAITING_BILLING if workflow.auto_send_to_billing_after_consultation else PatientVisit.Status.CONSULTATION_FINISHED
    if visit.status == next_status:
        return visit, False
    visit.touch_status(next_status, user=user)
    _audit(request, visit, AuditLog.Action.COMPLETE, "Consulta completada en flujo de visita.", old)
    return visit, True


def send_to_billing(visit, *, user, request=None):
    _assert_role(user, DOCTOR_ROLES | RECEPTION_ROLES, "No tienes permiso para enviar a caja.")
    if visit.status not in [PatientVisit.Status.CONSULTATION_FINISHED, PatientVisit.Status.IN_CONSULTATION, PatientVisit.Status.WAITING_DOCTOR]:
        raise ValidationError("La visita no puede pasar a caja desde su estado actual.")
    old = visit.status
    visit.touch_status(PatientVisit.Status.WAITING_BILLING, user=user)
    _audit(request, visit, AuditLog.Action.UPDATE, "Paciente enviado a caja.", old)
    return visit


def register_payment(visit, *, user, request=None):
    _assert_role(user, CASHIER_ROLES, "No tienes permiso para registrar pago de visita.")
    if not visit.invoice_id:
        raise ValidationError("No hay factura para esta visita.")
    if visit.invoice.status not in [Invoice.Status.PAGADA, Invoice.Status.PARCIAL]:
        raise ValidationError("La factura no tiene pagos aplicados.")
    old = visit.status
    visit.touch_status(PatientVisit.Status.PAID, user=user)
    _audit(request, visit, AuditLog.Action.PAYMENT, "Pago registrado en visita.", old)
    return visit


def complete_visit(visit, *, user, request=None):
    _assert_role(user, CASHIER_ROLES | RECEPTION_ROLES, "No tienes permiso para completar visita.")
    workflow = get_or_create_workflow_settings(visit.clinic)
    if workflow.billing_after_consultation and visit.invoice_id and visit.invoice.balance_due > 0:
        raise ValidationError("No puedes completar una visita con factura pendiente.")
    old = visit.status
    visit.touch_status(PatientVisit.Status.COMPLETED, user=user)
    _audit(request, visit, AuditLog.Action.COMPLETE, "Visita completada.", old)
    return visit


@transaction.atomic
def cancel_visit(visit, *, user, reason, request=None):
    _assert_role(user, RECEPTION_ROLES, "No tienes permiso para cancelar visita.")
    visit = PatientVisit.objects.select_for_update().select_related("clinic").get(pk=visit.pk)
    _assert_clinic(user, visit.clinic)
    cancellable = [PatientVisit.Status.REGISTERED, PatientVisit.Status.WAITING_TRIAGE, PatientVisit.Status.WAITING_DOCTOR]
    if visit.status not in cancellable:
        raise ValidationError("La visita ya no puede cancelarse desde recepción en su estado actual.")
    old = visit.status
    visit.cancellation_reason = reason
    visit.touch_status(PatientVisit.Status.CANCELLED, user=user)
    visit.save(update_fields=["status", "cancelled_at", "checkout_at", "active", "cancellation_reason", "actualizado_en"])
    _audit(request, visit, AuditLog.Action.CANCEL, "Visita cancelada.", old)
    return visit
