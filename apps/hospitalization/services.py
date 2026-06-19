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
    MedicationAdministration,
    NursingNote,
    NursingRound,
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


def ensure_active_hospitalization(hospitalization):
    if not hospitalization.is_active:
        raise ValidationError("No se puede operar sobre una hospitalizacion cerrada.")


def create_nursing_round(hospitalization, nurse, request=None, **payload):
    ensure_active_hospitalization(hospitalization)
    with transaction.atomic():
        locked = Hospitalization.objects.select_for_update().get(pk=hospitalization.pk)
        ensure_active_hospitalization(locked)
        nursing_round = NursingRound.objects.create(hospitalization=locked, nurse=nurse, **payload)
        _log_event(locked, "nursing_round_created", "Ronda de enfermeria creada.", user=nurse, metadata={"nursing_round": nursing_round.id})
        log_audit_event(request=request, user=nurse, clinic=locked.clinic, action=AuditLog.Action.CREATE, module=AuditLog.Module.MEDICAL_RECORDS, obj=nursing_round, description="Ronda de enfermeria hospitalaria creada.")
        return nursing_round


def get_pending_medications(clinic):
    return MedicationAdministration.objects.select_related("clinic", "hospitalization", "patient", "administered_by").filter(
        clinic=clinic,
        hospitalization__status__in=Hospitalization.ACTIVE_STATUSES,
        status__in=[MedicationAdministration.Status.PENDING, MedicationAdministration.Status.DELAYED],
    )


def create_medication_administration(hospitalization, user=None, request=None, **payload):
    ensure_active_hospitalization(hospitalization)
    prescription = payload.get("prescription")
    prescription_item = payload.get("prescription_item")
    validate_same_clinic(hospitalization.clinic, prescription=prescription)
    if prescription_item and prescription_item.prescription.clinic_id != hospitalization.clinic_id:
        raise ValidationError("El medicamento de receta debe pertenecer a la misma clinica.")
    with transaction.atomic():
        locked = Hospitalization.objects.select_for_update().get(pk=hospitalization.pk)
        ensure_active_hospitalization(locked)
        medication = MedicationAdministration.objects.create(hospitalization=locked, **payload)
        _log_event(locked, "medication_scheduled", "Medicamento programado para administracion.", user=user, metadata={"medication_administration": medication.id, "medication_name": medication.medication_name})
        log_audit_event(request=request, user=user, clinic=locked.clinic, action=AuditLog.Action.CREATE, module=AuditLog.Module.MEDICAL_RECORDS, obj=medication, description="Medicamento hospitalario programado.", new_values={"status": medication.status})
        return medication


def _lock_medication_for_action(medication_administration):
    medication = MedicationAdministration.objects.select_for_update().select_related("hospitalization").get(pk=medication_administration.pk)
    ensure_active_hospitalization(medication.hospitalization)
    if medication.status == MedicationAdministration.Status.ADMINISTERED:
        raise ValidationError("Este medicamento ya fue administrado.")
    if medication.status in [MedicationAdministration.Status.OMITTED, MedicationAdministration.Status.CANCELLED]:
        raise ValidationError("Este medicamento ya no permite cambios de administracion.")
    return medication


def mark_medication_administered(medication_administration, nurse, request=None, notes=""):
    with transaction.atomic():
        medication = _lock_medication_for_action(medication_administration)
        old_status = medication.status
        medication.status = MedicationAdministration.Status.ADMINISTERED
        medication.administered_time = timezone.now()
        medication.administered_by = nurse
        medication.notes = notes or medication.notes
        medication.save(update_fields=["status", "administered_time", "administered_by", "notes", "actualizado_en"])
        _log_event(medication.hospitalization, "medication_administered", "Medicamento administrado.", user=nurse, metadata={"medication_administration": medication.id, "medication_name": medication.medication_name})
        log_audit_event(request=request, user=nurse, clinic=medication.clinic, action=AuditLog.Action.COMPLETE, module=AuditLog.Module.MEDICAL_RECORDS, obj=medication, description="Medicamento hospitalario administrado.", old_values={"status": old_status}, new_values={"status": medication.status})
        return medication


def mark_medication_omitted(medication_administration, nurse, request=None, reason="", notes=""):
    if not reason:
        raise ValidationError("El motivo de omision es obligatorio.")
    with transaction.atomic():
        medication = _lock_medication_for_action(medication_administration)
        old_status = medication.status
        medication.status = MedicationAdministration.Status.OMITTED
        medication.administered_by = nurse
        medication.omission_reason = reason
        medication.notes = notes or medication.notes
        medication.save(update_fields=["status", "administered_by", "omission_reason", "notes", "actualizado_en"])
        _log_event(medication.hospitalization, "medication_omitted", "Medicamento omitido.", user=nurse, metadata={"medication_administration": medication.id, "reason": reason})
        log_audit_event(request=request, user=nurse, clinic=medication.clinic, action=AuditLog.Action.UPDATE, module=AuditLog.Module.MEDICAL_RECORDS, obj=medication, description="Medicamento hospitalario omitido.", old_values={"status": old_status}, new_values={"status": medication.status, "omission_reason": reason})
        return medication


def mark_medication_delayed(medication_administration, nurse, request=None, notes=""):
    with transaction.atomic():
        medication = _lock_medication_for_action(medication_administration)
        old_status = medication.status
        medication.status = MedicationAdministration.Status.DELAYED
        medication.administered_by = nurse
        medication.notes = notes or medication.notes
        medication.save(update_fields=["status", "administered_by", "notes", "actualizado_en"])
        _log_event(medication.hospitalization, "medication_delayed", "Medicamento retrasado.", user=nurse, metadata={"medication_administration": medication.id, "notes": notes})
        log_audit_event(request=request, user=nurse, clinic=medication.clinic, action=AuditLog.Action.UPDATE, module=AuditLog.Module.MEDICAL_RECORDS, obj=medication, description="Medicamento hospitalario retrasado.", old_values={"status": old_status}, new_values={"status": medication.status, "notes": notes})
        return medication
