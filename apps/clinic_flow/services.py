from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.accounts.permissions import get_role_name
from apps.admissions.models import PatientVisit
from apps.audit.models import AuditLog
from apps.audit.services import log_audit_event
from apps.billing.models import Invoice
from apps.clinic_settings.models import get_or_create_workflow_settings
from apps.medical_records.models import ClinicalConsultation, MedicalRecord


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


def _audit(request, visit, action, description, old_status=None):
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
        new_values={"status": visit.status},
    )


def next_entry_status(clinic, visit_type):
    workflow = get_or_create_workflow_settings(clinic)
    if visit_type == PatientVisit.VisitType.APPOINTMENT:
        return PatientVisit.Status.WAITING_TRIAGE if workflow.appointment_requires_triage else PatientVisit.Status.WAITING_DOCTOR
    return PatientVisit.Status.WAITING_TRIAGE if workflow.walk_in_requires_triage else PatientVisit.Status.WAITING_DOCTOR


@transaction.atomic
def create_walk_in_visit(*, patient, reason, user, request=None, **extra):
    _assert_role(user, RECEPTION_ROLES | {"enfermera"}, "No tienes permiso para registrar pacientes sin cita.")
    _assert_clinic(user, patient.clinic)
    workflow = get_or_create_workflow_settings(patient.clinic)
    if not workflow.allow_walk_in_patients:
        raise ValidationError("La clinica no permite pacientes sin cita.")
    if PatientVisit.objects.filter(patient=patient, visit_date=timezone.localdate(), status__in=PatientVisit.ACTIVE_STATUSES).exists():
        raise ValidationError("Este paciente ya tiene una visita activa hoy.")
    record, _ = MedicalRecord.objects.get_or_create(patient=patient, defaults={"clinic": patient.clinic})
    visit = PatientVisit.objects.create(
        clinic=patient.clinic,
        patient=patient,
        medical_record=record,
        visit_type=PatientVisit.VisitType.WALK_IN,
        origin=PatientVisit.Origin.RECEPTION,
        reason=reason,
        status=next_entry_status(patient.clinic, PatientVisit.VisitType.WALK_IN),
        created_by=user,
        checked_in_by=user,
        **extra,
    )
    _audit(request, visit, AuditLog.Action.CREATE, "Admision sin cita creada.")
    return visit


@transaction.atomic
def check_in_appointment(*, appointment, user, request=None, priority=PatientVisit.Priority.NORMAL, symptoms="", assigned_nurse=None):
    _assert_role(user, RECEPTION_ROLES, "No tienes permiso para hacer check-in.")
    _assert_clinic(user, appointment.clinic)
    workflow = get_or_create_workflow_settings(appointment.clinic)
    if not workflow.allow_appointments:
        raise ValidationError("La clinica no permite citas.")
    if appointment.status == appointment.Status.CANCELADA:
        raise ValidationError("No puedes hacer check-in de una cita cancelada.")
    if PatientVisit.objects.filter(appointment=appointment, status__in=PatientVisit.ACTIVE_STATUSES).exists():
        raise ValidationError("Esta cita ya tiene una visita activa.")
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
    return visit


def send_to_triage(visit, *, user, request=None):
    _assert_role(user, RECEPTION_ROLES | TRIAGE_ROLES, "No tienes permiso para enviar a triaje.")
    if visit.status not in [PatientVisit.Status.REGISTERED, PatientVisit.Status.WAITING_DOCTOR]:
        raise ValidationError("La visita no puede enviarse a triaje desde su estado actual.")
    old = visit.status
    visit.touch_status(PatientVisit.Status.WAITING_TRIAGE, user=user)
    _audit(request, visit, AuditLog.Action.UPDATE, "Paciente enviado a triaje.", old)
    return visit


def start_triage(visit, *, user, request=None):
    _assert_role(user, TRIAGE_ROLES, "No tienes permiso para iniciar triaje.")
    if visit.status not in [PatientVisit.Status.REGISTERED, PatientVisit.Status.WAITING_TRIAGE]:
        raise ValidationError("La visita no esta esperando triaje.")
    old = visit.status
    visit.touch_status(PatientVisit.Status.IN_TRIAGE, user=user)
    _audit(request, visit, AuditLog.Action.UPDATE, "Triaje iniciado.", old)
    return visit


def complete_triage(visit, *, user, request=None):
    _assert_role(user, TRIAGE_ROLES, "No tienes permiso para finalizar triaje.")
    if visit.status != PatientVisit.Status.IN_TRIAGE:
        raise ValidationError("La visita no esta en triaje.")
    if not visit.vital_signs.exists():
        raise ValidationError("Registra signos vitales antes de finalizar triaje.")
    old = visit.status
    visit.touch_status(PatientVisit.Status.WAITING_DOCTOR, user=user)
    _audit(request, visit, AuditLog.Action.FINALIZE, "Triaje finalizado.", old)
    return visit


def send_to_doctor(visit, *, user, request=None):
    _assert_role(user, RECEPTION_ROLES | TRIAGE_ROLES, "No tienes permiso para enviar al medico.")
    if visit.status not in [PatientVisit.Status.REGISTERED, PatientVisit.Status.WAITING_TRIAGE, PatientVisit.Status.IN_TRIAGE]:
        raise ValidationError("La visita no puede enviarse al medico desde su estado actual.")
    old = visit.status
    visit.touch_status(PatientVisit.Status.WAITING_DOCTOR, user=user)
    _audit(request, visit, AuditLog.Action.UPDATE, "Paciente enviado al medico.", old)
    return visit


@transaction.atomic
def start_consultation(visit, *, user, request=None):
    _assert_role(user, DOCTOR_ROLES, "Solo medicos pueden iniciar consulta.")
    if visit.status not in [PatientVisit.Status.WAITING_DOCTOR, PatientVisit.Status.IN_CONSULTATION]:
        raise ValidationError("La visita no esta esperando doctor.")
    if visit.assigned_doctor_id and visit.assigned_doctor.user_id != user.id:
        raise ValidationError("Esta visita esta asignada a otro medico.")
    doctor = visit.assigned_doctor or getattr(user, "doctor_profile", None)
    if not doctor:
        raise ValidationError("No hay medico asignado.")
    consultation = visit.consultation
    if not consultation:
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
        visit.consultation = consultation
    old = visit.status
    visit.assigned_doctor = doctor
    visit.touch_status(PatientVisit.Status.IN_CONSULTATION, user=user)
    visit.save(update_fields=["assigned_doctor", "consultation", "status", "consultation_started_at", "actualizado_en"])
    _audit(request, visit, AuditLog.Action.CREATE, "Consulta iniciada desde visita.", old)
    return visit, consultation


def complete_consultation(visit, *, user, request=None):
    _assert_role(user, DOCTOR_ROLES, "Solo medicos pueden completar consulta.")
    if not visit.consultation_id:
        raise ValidationError("La visita no tiene consulta iniciada.")
    if visit.consultation.status != ClinicalConsultation.Status.FINALIZADA:
        raise ValidationError("La consulta debe estar finalizada antes de cerrar atencion medica.")
    workflow = get_or_create_workflow_settings(visit.clinic)
    old = visit.status
    next_status = PatientVisit.Status.WAITING_BILLING if workflow.auto_send_to_billing_after_consultation else PatientVisit.Status.CONSULTATION_FINISHED
    visit.touch_status(next_status, user=user)
    _audit(request, visit, AuditLog.Action.COMPLETE, "Consulta completada en flujo de visita.", old)
    return visit


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


def cancel_visit(visit, *, user, reason, request=None):
    _assert_role(user, RECEPTION_ROLES, "No tienes permiso para cancelar visita.")
    if visit.status in [PatientVisit.Status.COMPLETED, PatientVisit.Status.CANCELLED]:
        raise ValidationError("La visita ya esta cerrada.")
    old = visit.status
    visit.cancellation_reason = reason
    visit.touch_status(PatientVisit.Status.CANCELLED, user=user)
    visit.save(update_fields=["status", "cancelled_at", "checkout_at", "active", "cancellation_reason", "actualizado_en"])
    _audit(request, visit, AuditLog.Action.CANCEL, "Visita cancelada.", old)
    return visit
