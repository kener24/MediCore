from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.audit.models import AuditLog
from apps.audit.services import log_audit_event
from apps.hospitalization.models import (
    HospitalBed,
    HospitalBedAssignment,
    Hospitalization,
    HospitalizationEvent,
    HospitalVitalSigns,
    MedicalEvolution,
    MedicalInstruction,
    MedicationAdministration,
    NursingNote,
    NursingRound,
    TreatmentPlan,
)


class BedUnavailableError(ValidationError):
    pass


class DuplicateHospitalizationError(ValidationError):
    pass


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
    with transaction.atomic():
        type(patient).objects.select_for_update().get(pk=patient.pk)
        idempotency_key = data.get("idempotency_key")
        if idempotency_key:
            existing = Hospitalization.objects.filter(clinic=clinic, admitted_by=user, idempotency_key=idempotency_key).first()
            if existing:
                return existing
        if Hospitalization.objects.filter(clinic=clinic, patient=patient, status__in=Hospitalization.OPEN_STATUSES).exists():
            raise DuplicateHospitalizationError("El paciente ya tiene un internamiento activo.")
        locked_bed = None
        if bed:
            locked_bed = HospitalBed.objects.select_for_update().get(pk=bed.pk)
            if not locked_bed.is_active or not locked_bed.room.is_active or locked_bed.status != HospitalBed.Status.AVAILABLE:
                raise BedUnavailableError("La cama seleccionada ya no esta disponible.")
            if HospitalBedAssignment.objects.filter(bed=locked_bed, released_at__isnull=True).exists():
                raise BedUnavailableError("La cama seleccionada ya no esta disponible.")

        if locked_bed and data.get("status") == Hospitalization.Status.PENDING_ADMISSION:
            data["status"] = Hospitalization.Status.ACTIVE

        try:
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
        except IntegrityError as exc:
            raise DuplicateHospitalizationError("El paciente ya tiene un internamiento activo.") from exc

        if locked_bed:
            locked_bed.status = HospitalBed.Status.OCCUPIED
            locked_bed.save(update_fields=["status", "actualizado_en"])
            HospitalBedAssignment.objects.create(hospitalization=hospitalization, bed=locked_bed, assigned_by=user)

        _log_event(hospitalization, "admission_created", "Internamiento creado.", user=user, metadata={"bed": locked_bed.id if locked_bed else None})
        log_audit_event(request=request, user=user, clinic=clinic, action=AuditLog.Action.CREATE, module=AuditLog.Module.ADMISSIONS, obj=hospitalization, description="Internamiento hospitalario creado.")
        return hospitalization


def assign_bed(hospitalization, bed, user=None, request=None, notes=""):
    if hospitalization.status not in Hospitalization.OPEN_STATUSES:
        raise ValidationError("Solo se puede asignar cama a un internamiento abierto.")
    validate_same_clinic(hospitalization.clinic, bed=bed)

    with transaction.atomic():
        locked_hospitalization = Hospitalization.objects.select_for_update().get(pk=hospitalization.pk)
        if locked_hospitalization.status not in Hospitalization.OPEN_STATUSES:
            raise ValidationError("Solo se puede asignar cama a un internamiento abierto.")
        locked_bed = HospitalBed.objects.select_for_update().get(pk=bed.pk)
        if not locked_bed.is_active or not locked_bed.room.is_active or locked_bed.status != HospitalBed.Status.AVAILABLE:
            raise BedUnavailableError("La cama seleccionada ya no esta disponible.")
        if HospitalBedAssignment.objects.filter(bed=locked_bed, released_at__isnull=True).exists():
            raise BedUnavailableError("La cama seleccionada ya no esta disponible.")
        if locked_hospitalization.current_bed_id:
            raise ValidationError("El internamiento ya tiene cama asignada. Usa cambio de cama.")
        locked_hospitalization.current_bed = locked_bed
        if locked_hospitalization.status == Hospitalization.Status.PENDING_ADMISSION:
            locked_hospitalization.status = Hospitalization.Status.ACTIVE
        locked_hospitalization.save(update_fields=["current_bed", "status", "actualizado_en"])
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
    if not notes.strip():
        raise ValidationError("El motivo del traslado es obligatorio.")

    with transaction.atomic():
        locked_hospitalization = Hospitalization.objects.select_for_update().get(pk=hospitalization.pk)
        if not locked_hospitalization.is_active:
            raise ValidationError("Solo se puede cambiar cama a una hospitalizacion activa.")
        locked_new_bed = HospitalBed.objects.select_for_update().get(pk=new_bed.pk)
        if not locked_new_bed.is_active or not locked_new_bed.room.is_active or locked_new_bed.status != HospitalBed.Status.AVAILABLE:
            raise BedUnavailableError("La cama seleccionada ya no esta disponible.")
        if HospitalBedAssignment.objects.filter(bed=locked_new_bed, released_at__isnull=True).exists():
            raise BedUnavailableError("La cama seleccionada ya no esta disponible.")
        old_bed = locked_hospitalization.current_bed
        if old_bed and old_bed.pk == locked_new_bed.pk:
            raise ValidationError("El paciente ya esta asignado a esa cama.")
        if old_bed:
            old_bed = HospitalBed.objects.select_for_update().get(pk=old_bed.pk)
        HospitalBedAssignment.objects.filter(hospitalization=locked_hospitalization, released_at__isnull=True).update(
            released_at=timezone.now(),
            released_by=user,
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
        if locked_hospitalization.status not in [Hospitalization.Status.ACTIVE, Hospitalization.Status.OBSERVATION, Hospitalization.Status.TRANSFERRED, Hospitalization.Status.DISCHARGE_PENDING]:
            raise ValidationError("No se puede dar alta a una hospitalizacion no activa.")
        bed = HospitalBed.objects.select_for_update().filter(pk=locked_hospitalization.current_bed_id).first() if locked_hospitalization.current_bed_id else None
        locked_hospitalization.status = Hospitalization.Status.DISCHARGED
        locked_hospitalization.discharge_datetime = timezone.now()
        locked_hospitalization.discharge_reason = discharge_reason
        locked_hospitalization.discharge_notes = discharge_notes
        locked_hospitalization.discharged_by = user
        locked_hospitalization.current_bed = None
        locked_hospitalization.save(update_fields=["status", "discharge_datetime", "discharge_reason", "discharge_notes", "discharged_by", "current_bed", "actualizado_en"])
        HospitalBedAssignment.objects.filter(hospitalization=locked_hospitalization, released_at__isnull=True).update(released_at=timezone.now(), released_by=user, release_reason="discharge")
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
        if locked_hospitalization.status not in Hospitalization.OPEN_STATUSES:
            raise ValidationError("Solo se puede cancelar un internamiento abierto.")
        bed = HospitalBed.objects.select_for_update().filter(pk=locked_hospitalization.current_bed_id).first() if locked_hospitalization.current_bed_id else None
        locked_hospitalization.status = Hospitalization.Status.CANCELLED
        locked_hospitalization.discharge_datetime = timezone.now()
        locked_hospitalization.discharge_reason = reason
        locked_hospitalization.current_bed = None
        locked_hospitalization.save(update_fields=["status", "discharge_datetime", "discharge_reason", "current_bed", "actualizado_en"])
        HospitalBedAssignment.objects.filter(hospitalization=locked_hospitalization, released_at__isnull=True).update(released_at=timezone.now(), released_by=user, release_reason="cancelled", notes=reason)
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
    _log_event(hospitalization, "vital_signs_created", "Signos vitales hospitalarios registrados.", user=user, metadata={"vital_signs": signs.id, "abnormal": signs.is_abnormal})
    log_audit_event(request=request, user=user, clinic=hospitalization.clinic, action=AuditLog.Action.CREATE, module=AuditLog.Module.MEDICAL_RECORDS, obj=signs, description="Signos vitales hospitalarios registrados.")
    return signs


def create_nursing_note(hospitalization, user=None, request=None, **data):
    if not hospitalization.is_active:
        raise ValidationError("No se pueden crear notas de enfermeria sin hospitalizacion activa.")
    note = NursingNote.objects.create(hospitalization=hospitalization, created_by=user, **data)
    _log_event(hospitalization, "nursing_note_created", "Nota de enfermeria creada.", user=user, metadata={"note": note.id})
    log_audit_event(request=request, user=user, clinic=hospitalization.clinic, action=AuditLog.Action.CREATE, module=AuditLog.Module.MEDICAL_RECORDS, obj=note, description="Nota de enfermeria hospitalaria creada.")
    return note


def correct_nursing_note(note, nurse, reason, note_text, request=None):
    if note.created_by_id != nurse.id and getattr(getattr(nurse, "role", None), "nombre", None) != "admin":
        raise ValidationError("No tienes permiso para corregir esta nota.")
    correction = NursingNote.objects.create(
        hospitalization=note.hospitalization,
        note_type=note.note_type,
        title=f"Correccion: {note.title}".strip(),
        note=note_text,
        shift=note.shift,
        status=NursingNote.Status.CORRECTION,
        correction_of=note,
        correction_reason=reason,
        created_by=nurse,
    )
    _log_event(note.hospitalization, "nursing_note_corrected", "Correccion de nota de enfermeria registrada.", user=nurse, metadata={"note": note.id, "correction": correction.id})
    log_audit_event(request=request, user=nurse, clinic=note.hospitalization.clinic, action=AuditLog.Action.UPDATE, module=AuditLog.Module.MEDICAL_RECORDS, obj=correction, description="Correccion de nota de enfermeria registrada.", metadata={"original_note": note.id})
    return correction


def ensure_active_hospitalization(hospitalization):
    if not hospitalization.is_active:
        raise ValidationError("No se puede operar sobre una hospitalizacion cerrada.")


def create_nursing_round(hospitalization, nurse, request=None, **payload):
    ensure_active_hospitalization(hospitalization)
    with transaction.atomic():
        locked = Hospitalization.objects.select_for_update().get(pk=hospitalization.pk)
        ensure_active_hospitalization(locked)
        idempotency_key = payload.get("idempotency_key")
        if idempotency_key:
            existing = NursingRound.objects.filter(clinic=locked.clinic, nurse=nurse, idempotency_key=idempotency_key).first()
            if existing:
                return existing
        nursing_round = NursingRound.objects.create(hospitalization=locked, nurse=nurse, **payload)
        _log_event(locked, "nursing_round_created", "Ronda de enfermeria creada.", user=nurse, metadata={"nursing_round": nursing_round.id})
        log_audit_event(request=request, user=nurse, clinic=locked.clinic, action=AuditLog.Action.CREATE, module=AuditLog.Module.MEDICAL_RECORDS, obj=nursing_round, description="Ronda de enfermeria hospitalaria creada.")
        return nursing_round


def create_medical_evolution(hospitalization, doctor, request=None, **payload):
    ensure_active_hospitalization(hospitalization)
    validate_same_clinic(hospitalization.clinic, doctor=doctor)
    evolution = MedicalEvolution.objects.create(hospitalization=hospitalization, doctor=doctor, **payload)
    _log_event(hospitalization, "medical_evolution_created", "Evolucion medica registrada.", user=doctor.user, metadata={"evolution": evolution.id, "status": evolution.status})
    log_audit_event(request=request, user=doctor.user, clinic=hospitalization.clinic, action=AuditLog.Action.CREATE, module=AuditLog.Module.MEDICAL_RECORDS, obj=evolution, description="Evolucion medica hospitalaria registrada.", new_values={"status": evolution.status})
    return evolution


def sign_medical_evolution(evolution, doctor, request=None):
    with transaction.atomic():
        locked = MedicalEvolution.objects.select_for_update().select_related("hospitalization").get(pk=evolution.pk)
        if locked.doctor_id != doctor.id:
            raise ValidationError("Solo el autor puede firmar esta evolucion.")
        if locked.status != MedicalEvolution.Status.DRAFT:
            raise ValidationError("La evolucion ya fue firmada.")
        ensure_active_hospitalization(locked.hospitalization)
        locked.status = MedicalEvolution.Status.SIGNED
        locked.signed_at = timezone.now()
        MedicalEvolution.objects.filter(pk=locked.pk).update(status=locked.status, signed_at=locked.signed_at, actualizado_en=timezone.now())
        _log_event(locked.hospitalization, "medical_evolution_signed", "Evolucion medica firmada.", user=doctor.user, metadata={"evolution": locked.id})
        log_audit_event(request=request, user=doctor.user, clinic=locked.hospitalization.clinic, action=AuditLog.Action.COMPLETE, module=AuditLog.Module.MEDICAL_RECORDS, obj=locked, description="Evolucion medica hospitalaria firmada.", old_values={"status": MedicalEvolution.Status.DRAFT}, new_values={"status": locked.status})
        return MedicalEvolution.objects.get(pk=locked.pk)


def correct_medical_evolution(evolution, doctor, reason, request=None, **payload):
    if evolution.status not in [MedicalEvolution.Status.SIGNED, MedicalEvolution.Status.CORRECTION]:
        raise ValidationError("Solo una evolucion firmada puede corregirse.")
    payload.pop("status", None)
    correction = MedicalEvolution.objects.create(
        hospitalization=evolution.hospitalization,
        doctor=doctor,
        status=MedicalEvolution.Status.CORRECTION,
        signed_at=timezone.now(),
        correction_of=evolution,
        correction_reason=reason,
        **payload,
    )
    _log_event(evolution.hospitalization, "medical_evolution_corrected", "Correccion de evolucion medica registrada.", user=doctor.user, metadata={"evolution": evolution.id, "correction": correction.id})
    log_audit_event(request=request, user=doctor.user, clinic=evolution.hospitalization.clinic, action=AuditLog.Action.UPDATE, module=AuditLog.Module.MEDICAL_RECORDS, obj=correction, description="Correccion de evolucion medica registrada.", metadata={"original_evolution": evolution.id})
    return correction


def create_treatment_plan(hospitalization, doctor, request=None, **payload):
    ensure_active_hospitalization(hospitalization)
    validate_same_clinic(hospitalization.clinic, doctor=doctor)
    with transaction.atomic():
        locked = Hospitalization.objects.select_for_update().get(pk=hospitalization.pk)
        current = TreatmentPlan.objects.filter(hospitalization=locked, status=TreatmentPlan.Status.ACTIVE).order_by("-version").first()
        if current:
            reason = (payload.get("change_reason") or "").strip()
            if not reason:
                raise ValidationError("El motivo del cambio de plan es obligatorio.")
            payload["replaces"] = current
            payload["version"] = current.version + 1
            TreatmentPlan.objects.filter(pk=current.pk).update(status=TreatmentPlan.Status.REPLACED, effective_until=timezone.now(), actualizado_en=timezone.now())
        else:
            payload["version"] = 1
        payload["status"] = TreatmentPlan.Status.ACTIVE
        plan = TreatmentPlan.objects.create(hospitalization=locked, doctor=doctor, **payload)
        _log_event(locked, "treatment_plan_created" if not current else "treatment_plan_replaced", "Plan de tratamiento actualizado.", user=doctor.user, metadata={"plan": plan.id, "version": plan.version})
        log_audit_event(request=request, user=doctor.user, clinic=locked.clinic, action=AuditLog.Action.CREATE if not current else AuditLog.Action.UPDATE, module=AuditLog.Module.MEDICAL_RECORDS, obj=plan, description="Plan de tratamiento hospitalario actualizado.", new_values={"version": plan.version, "status": plan.status})
        return plan


def create_medical_instruction(hospitalization, doctor, request=None, **payload):
    ensure_active_hospitalization(hospitalization)
    validate_same_clinic(hospitalization.clinic, doctor=doctor)
    instruction = MedicalInstruction.objects.create(hospitalization=hospitalization, doctor=doctor, **payload)
    _log_event(hospitalization, "medical_instruction_created", "Indicacion medica creada.", user=doctor.user, metadata={"instruction": instruction.id, "priority": instruction.priority})
    log_audit_event(request=request, user=doctor.user, clinic=hospitalization.clinic, action=AuditLog.Action.CREATE, module=AuditLog.Module.MEDICAL_ORDERS, obj=instruction, description="Indicacion medica hospitalaria creada.", new_values={"status": instruction.status, "priority": instruction.priority})
    return instruction


def acknowledge_medical_instruction(instruction, nurse, request=None):
    with transaction.atomic():
        locked = MedicalInstruction.objects.select_for_update().select_related("hospitalization").get(pk=instruction.pk)
        if locked.status not in [MedicalInstruction.Status.ACTIVE, MedicalInstruction.Status.ACKNOWLEDGED]:
            raise ValidationError("La indicacion no permite confirmacion de lectura.")
        if locked.acknowledged_at:
            return locked
        locked.status = MedicalInstruction.Status.ACKNOWLEDGED
        locked.acknowledged_by = nurse
        locked.acknowledged_at = timezone.now()
        locked.save(update_fields=["status", "acknowledged_by", "acknowledged_at", "actualizado_en"])
        _log_event(locked.hospitalization, "medical_instruction_acknowledged", "Indicacion medica revisada por enfermeria.", user=nurse, metadata={"instruction": locked.id})
        log_audit_event(request=request, user=nurse, clinic=locked.hospitalization.clinic, action=AuditLog.Action.VIEW, module=AuditLog.Module.MEDICAL_ORDERS, obj=locked, description="Lectura de indicacion medica confirmada.", new_values={"status": locked.status})
        return locked


def change_medical_instruction_status(instruction, doctor, status, reason="", request=None, user=None):
    allowed = {
        MedicalInstruction.Status.COMPLETED,
        MedicalInstruction.Status.SUSPENDED,
        MedicalInstruction.Status.CANCELLED,
        MedicalInstruction.Status.IN_PROGRESS,
    }
    if status not in allowed:
        raise ValidationError("Estado de indicacion no valido.")
    if status in [MedicalInstruction.Status.SUSPENDED, MedicalInstruction.Status.CANCELLED] and not reason.strip():
        raise ValidationError("El motivo es obligatorio.")
    with transaction.atomic():
        locked = MedicalInstruction.objects.select_for_update().select_related("hospitalization").get(pk=instruction.pk)
        if locked.status in [MedicalInstruction.Status.COMPLETED, MedicalInstruction.Status.SUSPENDED, MedicalInstruction.Status.CANCELLED]:
            raise ValidationError("La indicacion ya fue cerrada.")
        old_status = locked.status
        locked.status = status
        locked.status_reason = reason
        if status == MedicalInstruction.Status.COMPLETED:
            locked.completed_by = user or doctor.user
            locked.completed_at = timezone.now()
        locked.save(update_fields=["status", "status_reason", "completed_by", "completed_at", "actualizado_en"])
        actor = user or doctor.user
        _log_event(locked.hospitalization, "medical_instruction_status", "Estado de indicacion medica actualizado.", user=actor, metadata={"instruction": locked.id, "status": status})
        log_audit_event(request=request, user=actor, clinic=locked.hospitalization.clinic, action=AuditLog.Action.UPDATE, module=AuditLog.Module.MEDICAL_ORDERS, obj=locked, description="Estado de indicacion medica actualizado.", old_values={"status": old_status}, new_values={"status": status})
        return locked


def create_hospital_event(hospitalization, user, request=None, **payload):
    ensure_active_hospitalization(hospitalization)
    event = HospitalizationEvent.objects.create(hospitalization=hospitalization, created_by=user, **payload)
    log_audit_event(request=request, user=user, clinic=hospitalization.clinic, action=AuditLog.Action.CREATE, module=AuditLog.Module.MEDICAL_RECORDS, obj=event, description="Evento clinico hospitalario registrado.", new_values={"event_type": event.event_type, "severity": event.severity})
    return event


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
