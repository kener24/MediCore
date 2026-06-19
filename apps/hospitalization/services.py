from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.audit.models import AuditLog
from apps.audit.services import log_audit_event
from apps.hospitalization.models import (
    HospitalBed,
    HospitalBedAssignment,
    Hospitalization,
    HospitalizationEvent,
    HospitalVitalSigns,
    NursingNote,
)


def _log_event(hospitalization, event_type, description, user=None, metadata=None):
    return HospitalizationEvent.objects.create(
        hospitalization=hospitalization,
        event_type=event_type,
        description=description,
        created_by=user,
        metadata=metadata or {},
    )


def validate_same_clinic(clinic, **objects):
    for label, obj in objects.items():
        if obj is not None and getattr(obj, "clinic_id", None) != clinic.id:
            raise ValidationError(f"{label} debe pertenecer a la misma clinica.")


def create_hospitalization(*, clinic, patient, user, bed=None, visit=None, consultation=None, responsible_doctor=None, request=None, **data):
    validate_same_clinic(clinic, patient=patient, bed=bed, visit=visit, consultation=consultation, responsible_doctor=responsible_doctor)
    if Hospitalization.objects.filter(clinic=clinic, patient=patient, status__in=Hospitalization.ACTIVE_STATUSES).exists():
        raise ValidationError("El paciente ya tiene una hospitalizacion activa en esta clinica.")

    with transaction.atomic():
        locked_bed = None
        if bed:
            locked_bed = HospitalBed.objects.select_for_update().get(pk=bed.pk)
            if locked_bed.status != HospitalBed.Status.AVAILABLE:
                raise ValidationError("La cama seleccionada no esta disponible.")

        hospitalization = Hospitalization.objects.create(
            clinic=clinic,
            patient=patient,
            visit=visit,
            consultation=consultation,
            responsible_doctor=responsible_doctor,
            admitted_by=user,
            current_bed=locked_bed,
            **data,
        )

        if locked_bed:
            locked_bed.status = HospitalBed.Status.OCCUPIED
            locked_bed.save(update_fields=["status", "actualizado_en"])
            HospitalBedAssignment.objects.create(hospitalization=hospitalization, bed=locked_bed, assigned_by=user)

        _log_event(hospitalization, "admission_created", "Internamiento creado.", user=user, metadata={"bed": locked_bed.id if locked_bed else None})
        log_audit_event(request=request, user=user, clinic=clinic, action=AuditLog.Action.CREATE, module=AuditLog.Module.ADMISSIONS, obj=hospitalization, description="Internamiento hospitalario creado.")
        return hospitalization


def assign_bed(hospitalization, bed, user=None, request=None, notes=""):
    if not hospitalization.is_active:
        raise ValidationError("Solo se puede asignar cama a una hospitalizacion activa.")
    validate_same_clinic(hospitalization.clinic, bed=bed)

    with transaction.atomic():
        locked_hospitalization = Hospitalization.objects.select_for_update().get(pk=hospitalization.pk)
        locked_bed = HospitalBed.objects.select_for_update().get(pk=bed.pk)
        if locked_bed.status != HospitalBed.Status.AVAILABLE:
            raise ValidationError("La cama seleccionada no esta disponible.")
        if locked_hospitalization.current_bed_id:
            raise ValidationError("El internamiento ya tiene cama asignada. Usa cambio de cama.")
        locked_hospitalization.current_bed = locked_bed
        locked_hospitalization.save(update_fields=["current_bed", "actualizado_en"])
        locked_bed.status = HospitalBed.Status.OCCUPIED
        locked_bed.save(update_fields=["status", "actualizado_en"])
        HospitalBedAssignment.objects.create(hospitalization=locked_hospitalization, bed=locked_bed, assigned_by=user, notes=notes)
        _log_event(locked_hospitalization, "bed_assigned", "Cama asignada.", user=user, metadata={"bed": locked_bed.id})
        log_audit_event(request=request, user=user, clinic=locked_hospitalization.clinic, action=AuditLog.Action.UPDATE, module=AuditLog.Module.ADMISSIONS, obj=locked_hospitalization, description="Cama asignada a internamiento.")
        return locked_hospitalization


def change_bed(hospitalization, new_bed, user=None, request=None, notes=""):
    if not hospitalization.is_active:
        raise ValidationError("Solo se puede cambiar cama a una hospitalizacion activa.")
    validate_same_clinic(hospitalization.clinic, bed=new_bed)

    with transaction.atomic():
        locked_hospitalization = Hospitalization.objects.select_for_update().get(pk=hospitalization.pk)
        locked_new_bed = HospitalBed.objects.select_for_update().get(pk=new_bed.pk)
        if locked_new_bed.status != HospitalBed.Status.AVAILABLE:
            raise ValidationError("La cama seleccionada no esta disponible.")
        old_bed = locked_hospitalization.current_bed
        if old_bed and old_bed.pk == locked_new_bed.pk:
            raise ValidationError("El paciente ya esta asignado a esa cama.")
        HospitalBedAssignment.objects.filter(hospitalization=locked_hospitalization, released_at__isnull=True).update(
            released_at=timezone.now(),
            release_reason="change_bed",
            notes=notes,
        )
        if old_bed:
            old_bed.status = HospitalBed.Status.CLEANING
            old_bed.save(update_fields=["status", "actualizado_en"])
        locked_new_bed.status = HospitalBed.Status.OCCUPIED
        locked_new_bed.save(update_fields=["status", "actualizado_en"])
        locked_hospitalization.current_bed = locked_new_bed
        locked_hospitalization.status = Hospitalization.Status.TRANSFERRED
        locked_hospitalization.transfer_notes = notes or locked_hospitalization.transfer_notes
        locked_hospitalization.save(update_fields=["current_bed", "status", "transfer_notes", "actualizado_en"])
        HospitalBedAssignment.objects.create(hospitalization=locked_hospitalization, bed=locked_new_bed, assigned_by=user, notes=notes)
        _log_event(locked_hospitalization, "bed_changed", "Cambio de cama registrado.", user=user, metadata={"old_bed": old_bed.id if old_bed else None, "new_bed": locked_new_bed.id})
        log_audit_event(request=request, user=user, clinic=locked_hospitalization.clinic, action=AuditLog.Action.UPDATE, module=AuditLog.Module.ADMISSIONS, obj=locked_hospitalization, description="Cambio de cama hospitalaria.")
        return locked_hospitalization


def discharge_hospitalization(hospitalization, user=None, request=None, discharge_reason="", discharge_notes="", bed_status=HospitalBed.Status.CLEANING):
    if hospitalization.status not in [Hospitalization.Status.ACTIVE, Hospitalization.Status.OBSERVATION, Hospitalization.Status.TRANSFERRED]:
        raise ValidationError("No se puede dar alta a una hospitalizacion no activa.")
    if bed_status not in [HospitalBed.Status.CLEANING, HospitalBed.Status.AVAILABLE]:
        raise ValidationError("Estado de cama posterior no valido.")

    with transaction.atomic():
        locked_hospitalization = Hospitalization.objects.select_for_update().get(pk=hospitalization.pk)
        bed = locked_hospitalization.current_bed
        locked_hospitalization.status = Hospitalization.Status.DISCHARGED
        locked_hospitalization.discharge_datetime = timezone.now()
        locked_hospitalization.discharge_reason = discharge_reason
        locked_hospitalization.discharge_notes = discharge_notes
        locked_hospitalization.discharged_by = user
        locked_hospitalization.current_bed = None
        locked_hospitalization.save(update_fields=["status", "discharge_datetime", "discharge_reason", "discharge_notes", "discharged_by", "current_bed", "actualizado_en"])
        HospitalBedAssignment.objects.filter(hospitalization=locked_hospitalization, released_at__isnull=True).update(released_at=timezone.now(), release_reason="discharge")
        if bed:
            bed.status = bed_status
            bed.save(update_fields=["status", "actualizado_en"])
        _log_event(locked_hospitalization, "discharged", "Alta hospitalaria registrada.", user=user)
        log_audit_event(request=request, user=user, clinic=locked_hospitalization.clinic, action=AuditLog.Action.COMPLETE, module=AuditLog.Module.ADMISSIONS, obj=locked_hospitalization, description="Alta hospitalaria registrada.")
        return locked_hospitalization


def cancel_hospitalization(hospitalization, user=None, request=None, reason=""):
    if not hospitalization.is_active:
        raise ValidationError("Solo se puede cancelar una hospitalizacion activa.")
    with transaction.atomic():
        locked_hospitalization = Hospitalization.objects.select_for_update().get(pk=hospitalization.pk)
        bed = locked_hospitalization.current_bed
        locked_hospitalization.status = Hospitalization.Status.CANCELLED
        locked_hospitalization.discharge_datetime = timezone.now()
        locked_hospitalization.discharge_reason = reason
        locked_hospitalization.current_bed = None
        locked_hospitalization.save(update_fields=["status", "discharge_datetime", "discharge_reason", "current_bed", "actualizado_en"])
        HospitalBedAssignment.objects.filter(hospitalization=locked_hospitalization, released_at__isnull=True).update(released_at=timezone.now(), release_reason="cancelled", notes=reason)
        if bed:
            bed.status = HospitalBed.Status.AVAILABLE
            bed.save(update_fields=["status", "actualizado_en"])
        _log_event(locked_hospitalization, "cancelled", "Internamiento cancelado.", user=user, metadata={"reason": reason})
        log_audit_event(request=request, user=user, clinic=locked_hospitalization.clinic, action=AuditLog.Action.CANCEL, module=AuditLog.Module.ADMISSIONS, obj=locked_hospitalization, description="Internamiento hospitalario cancelado.")
        return locked_hospitalization


def create_hospital_vital_signs(hospitalization, user=None, request=None, **data):
    if not hospitalization.is_active:
        raise ValidationError("No se pueden registrar signos vitales sin hospitalizacion activa.")
    signs = HospitalVitalSigns.objects.create(hospitalization=hospitalization, recorded_by=user, **data)
    _log_event(hospitalization, "vital_signs_created", "Signos vitales hospitalarios registrados.", user=user, metadata={"vital_signs": signs.id})
    log_audit_event(request=request, user=user, clinic=hospitalization.clinic, action=AuditLog.Action.CREATE, module=AuditLog.Module.MEDICAL_RECORDS, obj=signs, description="Signos vitales hospitalarios registrados.")
    return signs


def create_nursing_note(hospitalization, user=None, request=None, **data):
    if not hospitalization.is_active:
        raise ValidationError("No se pueden crear notas de enfermeria sin hospitalizacion activa.")
    note = NursingNote.objects.create(hospitalization=hospitalization, created_by=user, **data)
    _log_event(hospitalization, "nursing_note_created", "Nota de enfermeria creada.", user=user, metadata={"note": note.id})
    log_audit_event(request=request, user=user, clinic=hospitalization.clinic, action=AuditLog.Action.CREATE, module=AuditLog.Module.MEDICAL_RECORDS, obj=note, description="Nota de enfermeria hospitalaria creada.")
    return note
