from datetime import timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models import Q
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
    DischargeSummary,
    NursingNote,
    NursingRound,
    TreatmentPlan,
)
from apps.billing.models import BillableService, Invoice, InvoiceItem
from apps.medical_records.models import ClinicalSupplyUsage
from apps.medical_records.services import consume_inventory_item
from apps.prescriptions.models import find_allergy_conflicts


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


def request_hospital_discharge(hospitalization, user=None, request=None, reason=""):
    with transaction.atomic():
        locked = Hospitalization.objects.select_for_update().get(pk=hospitalization.pk)
        if locked.status == Hospitalization.Status.DISCHARGE_PENDING:
            return locked
        if locked.status not in [Hospitalization.Status.ACTIVE, Hospitalization.Status.OBSERVATION, Hospitalization.Status.TRANSFERRED]:
            raise ValidationError("Solo se puede solicitar el alta de un internamiento activo.")
        locked.status = Hospitalization.Status.DISCHARGE_PENDING
        locked.discharge_reason = (reason or "").strip()
        locked.save(update_fields=["status", "discharge_reason", "actualizado_en"])
        _log_event(locked, "discharge_requested", "Alta hospitalaria solicitada.", user=user)
        log_audit_event(request=request, user=user, clinic=locked.clinic, action=AuditLog.Action.UPDATE, module=AuditLog.Module.ADMISSIONS, obj=locked, description="Alta hospitalaria solicitada.", new_values={"status": locked.status})
        return locked


def save_discharge_summary(hospitalization, doctor, request=None, correction_reason="", **payload):
    with transaction.atomic():
        locked = Hospitalization.objects.select_for_update().get(pk=hospitalization.pk)
        if locked.status == Hospitalization.Status.DISCHARGED:
            raise ValidationError("El internamiento ya fue dado de alta.")
        latest = DischargeSummary.objects.select_for_update().filter(hospitalization=locked).order_by("-version").first()
        if latest and latest.status == DischargeSummary.Status.DRAFT:
            if latest.doctor_id != doctor.id:
                raise ValidationError("Solo el autor puede editar el borrador del resumen.")
            for field, value in payload.items():
                setattr(latest, field, value)
            latest.save()
            summary = latest
        else:
            if latest and len((correction_reason or "").strip()) < 5:
                raise ValidationError("La correccion requiere un motivo de al menos 5 caracteres.")
            summary = DischargeSummary.objects.create(
                hospitalization=locked,
                doctor=doctor,
                version=(latest.version + 1 if latest else 1),
                replaces=latest,
                correction_reason=(correction_reason or "").strip(),
                **payload,
            )
        _log_event(locked, "discharge_summary_saved", "Resumen de egreso guardado.", user=doctor.user, metadata={"summary": summary.id, "version": summary.version})
        log_audit_event(request=request, user=doctor.user, clinic=locked.clinic, action=AuditLog.Action.CREATE, module=AuditLog.Module.MEDICAL_RECORDS, obj=summary, description="Resumen de egreso guardado.", new_values={"version": summary.version, "status": summary.status})
        return summary


def sign_discharge_summary(summary, doctor, request=None):
    with transaction.atomic():
        locked = DischargeSummary.objects.select_for_update().select_related("hospitalization").get(pk=summary.pk)
        if locked.status == DischargeSummary.Status.SIGNED:
            return locked
        if locked.status != DischargeSummary.Status.DRAFT or locked.doctor_id != doctor.id:
            raise ValidationError("Solo el autor puede firmar el borrador del resumen.")
        locked.status = DischargeSummary.Status.SIGNED
        locked.signed_at = timezone.now()
        locked.signed_by = doctor.user
        locked.full_clean()
        DischargeSummary.objects.filter(pk=locked.pk).update(status=locked.status, signed_at=locked.signed_at, signed_by=locked.signed_by, actualizado_en=timezone.now())
        if locked.replaces_id:
            DischargeSummary.objects.filter(pk=locked.replaces_id, status=DischargeSummary.Status.SIGNED).update(status=DischargeSummary.Status.REPLACED, actualizado_en=timezone.now())
        _log_event(locked.hospitalization, "discharge_summary_signed", "Resumen de egreso firmado.", user=doctor.user, metadata={"summary": locked.id, "version": locked.version})
        log_audit_event(request=request, user=doctor.user, clinic=locked.hospitalization.clinic, action=AuditLog.Action.COMPLETE, module=AuditLog.Module.MEDICAL_RECORDS, obj=locked, description="Resumen de egreso firmado.", new_values={"version": locked.version, "status": locked.status})
        return DischargeSummary.objects.get(pk=locked.pk)


def register_hospital_consumption(hospitalization, user, request=None, **payload):
    ensure_active_hospitalization(hospitalization)
    item = payload.get("inventory_item")
    validate_same_clinic(hospitalization.clinic, inventory_item=item)
    payload.update(
        clinic=hospitalization.clinic,
        patient=hospitalization.patient,
        hospitalization=hospitalization,
        applied_by=user,
        nurse=user,
        idempotency_key=(payload.get("idempotency_key") or "")[:100] or None,
    )
    usage = consume_inventory_item(payload)
    if not getattr(usage, "_idempotent_replay", False):
        _log_event(hospitalization, "hospital_consumption_created", "Consumo hospitalario registrado.", user=user, metadata={"consumption": usage.id, "item": usage.inventory_item_id})
        log_audit_event(request=request, user=user, clinic=hospitalization.clinic, action=AuditLog.Action.CREATE, module=AuditLog.Module.INVENTORY, obj=usage, description="Consumo hospitalario registrado.")
    return usage


def generate_hospital_invoice(hospitalization, user, request=None):
    with transaction.atomic():
        locked = Hospitalization.objects.select_for_update().select_related("clinic", "patient", "visit", "consultation").get(pk=hospitalization.pk)
        if getattr(user, "clinica_id", None) != locked.clinic_id:
            raise ValidationError("No tienes permiso sobre este internamiento.")
        invoice, created = Invoice.objects.select_for_update().get_or_create(
            hospitalization=locked,
            defaults={"clinic": locked.clinic, "patient": locked.patient, "appointment": getattr(locked.visit, "appointment", None) if locked.visit_id else None, "consultation": locked.consultation, "created_by": user, "notes": f"Factura hospitalaria del internamiento {locked.id}"},
        )
        if invoice.paid_amount > 0 or invoice.fiscal_status == Invoice.FiscalStatus.ISSUED:
            return invoice, created
        consumptions = ClinicalSupplyUsage.objects.select_for_update().filter(hospitalization=locked, active=True, billable=True, invoiced=False).exclude(status=ClinicalSupplyUsage.Status.CANCELLED)
        for usage in consumptions:
            item, item_created = InvoiceItem.objects.get_or_create(
                invoice=invoice,
                source_type="hospital_consumption",
                source_id=str(usage.id),
                defaults={"item_type": InvoiceItem.Type.CONSUMPTION, "related_consumption": usage, "description": usage.description, "quantity": usage.quantity, "unit_price": usage.unit_price},
            )
            if item_created or usage.invoice_item_id != item.id:
                usage.invoiced = True
                usage.invoice = invoice
                usage.invoice_item = item
                usage.status = ClinicalSupplyUsage.Status.INVOICED
                usage.save(update_fields=["invoiced", "invoice", "invoice_item", "status", "actualizado_en"])
        stay_service = BillableService.objects.filter(clinic=locked.clinic, active=True).filter(Q(code__iexact="HOSPITAL_STAY") | Q(code__iexact="ESTANCIA") | Q(name__icontains="estancia hospital")).order_by("id").first()
        if stay_service:
            end = locked.discharge_datetime or timezone.now()
            days = max(1, (end.date() - locked.admission_datetime.date()).days + 1)
            InvoiceItem.objects.get_or_create(
                invoice=invoice,
                source_type="hospital_stay",
                source_id=str(locked.id),
                defaults={"item_type": InvoiceItem.Type.SERVICE, "service": stay_service, "description": stay_service.name, "quantity": Decimal(days), "unit_price": stay_service.price, "tax_rate": stay_service.tax_rate if stay_service.taxable else Decimal("0")},
            )
        invoice.recalculate()
        if created:
            _log_event(locked, "hospital_invoice_generated", "Factura hospitalaria generada.", user=user, metadata={"invoice": invoice.id})
            log_audit_event(request=request, user=user, clinic=locked.clinic, action=AuditLog.Action.CREATE, module=AuditLog.Module.BILLING, obj=invoice, description="Factura hospitalaria generada.", new_values={"hospitalization": locked.id})
        return invoice, created


def discharge_hospitalization(hospitalization, user=None, request=None, discharge_reason="", discharge_notes="", allow_pending_balance=False, bed_status=HospitalBed.Status.CLEANING):
    if bed_status != HospitalBed.Status.CLEANING:
        raise ValidationError("La cama debe pasar por limpieza despues del alta.")
    with transaction.atomic():
        locked = Hospitalization.objects.select_for_update().select_related("visit").get(pk=hospitalization.pk)
        if locked.status == Hospitalization.Status.DISCHARGED:
            return locked
        if locked.status != Hospitalization.Status.DISCHARGE_PENDING:
            raise ValidationError("Primero solicita el alta hospitalaria.")
        summary = locked.discharge_summaries.select_for_update().filter(status=DischargeSummary.Status.SIGNED).order_by("-version").first()
        if not summary:
            raise ValidationError("Se requiere un resumen de egreso firmado antes de completar el alta.")
        invoice, _ = generate_hospital_invoice(locked, user, request=request)
        invoice.refresh_from_db()
        if invoice.balance_due > 0 and not allow_pending_balance:
            raise ValidationError("La factura hospitalaria tiene saldo pendiente. Registra el pago o autoriza expresamente el saldo.")
        bed = HospitalBed.objects.select_for_update().filter(pk=locked.current_bed_id).first() if locked.current_bed_id else None
        now = timezone.now()
        locked.status = Hospitalization.Status.DISCHARGED
        locked.discharge_datetime = now
        locked.discharge_reason = discharge_reason or summary.get_discharge_type_display()
        locked.discharge_notes = discharge_notes
        locked.discharged_by = user
        locked.current_bed = None
        locked.save(update_fields=["status", "discharge_datetime", "discharge_reason", "discharge_notes", "discharged_by", "current_bed", "actualizado_en"])
        HospitalBedAssignment.objects.filter(hospitalization=locked, released_at__isnull=True).update(released_at=now, released_by=user, release_reason="discharge")
        if bed:
            bed.status = HospitalBed.Status.CLEANING
            bed.save(update_fields=["status", "actualizado_en"])
        MedicalInstruction.objects.filter(hospitalization=locked, status__in=[MedicalInstruction.Status.ACTIVE, MedicalInstruction.Status.ACKNOWLEDGED, MedicalInstruction.Status.IN_PROGRESS]).update(status=MedicalInstruction.Status.COMPLETED, completed_by=user, completed_at=now, actualizado_en=now)
        MedicationAdministration.objects.filter(hospitalization=locked, status__in=[MedicationAdministration.Status.PENDING, MedicationAdministration.Status.SCHEDULED, MedicationAdministration.Status.DUE, MedicationAdministration.Status.DELAYED]).update(status=MedicationAdministration.Status.CANCELLED, status_recorded_at=now, notes="Cancelada por alta hospitalaria.", actualizado_en=now)
        if locked.visit_id:
            visit_model = type(locked.visit)
            complete_status = getattr(visit_model.Status, "COMPLETED", None)
            if complete_status:
                visit_model.objects.filter(pk=locked.visit_id).update(status=complete_status, actualizado_en=now)
        _log_event(locked, "discharged", "Alta hospitalaria completada.", user=user, metadata={"summary": summary.id, "invoice": invoice.id, "pending_balance_authorized": bool(invoice.balance_due > 0)})
        log_audit_event(request=request, user=user, clinic=locked.clinic, action=AuditLog.Action.COMPLETE, module=AuditLog.Module.ADMISSIONS, obj=locked, description="Alta hospitalaria completada.", new_values={"summary": summary.id, "invoice": invoice.id, "bed_status": HospitalBed.Status.CLEANING})
        return locked


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
    with transaction.atomic():
        locked = Hospitalization.objects.select_for_update().select_related("patient").get(pk=hospitalization.pk)
        ensure_active_hospitalization(locked)
        inventory_item = payload.get("inventory_item")
        if payload.get("instruction_type") == MedicalInstruction.InstructionType.MEDICATION and inventory_item:
            conflicts = find_allergy_conflicts(locked.patient, " ".join(filter(None, [inventory_item.name, payload.get("generic_name", "")])))
            if conflicts:
                payload["allergy_warning"] = ", ".join(conflicts)
                if len((payload.get("allergy_override_reason") or "").strip()) < 8:
                    raise ValidationError({"allergy_override_reason": "Este paciente tiene una alergia registrada relacionada con el medicamento indicado. Justifica la decision clinica."})
        instruction = MedicalInstruction.objects.create(hospitalization=locked, doctor=doctor, **payload)
        scheduled = schedule_medication_administrations(instruction, user=doctor.user, request=request)
        _log_event(locked, "medical_instruction_created", "Indicacion medica creada.", user=doctor.user, metadata={"instruction": instruction.id, "priority": instruction.priority, "scheduled_doses": len(scheduled)})
        log_audit_event(request=request, user=doctor.user, clinic=locked.clinic, action=AuditLog.Action.CREATE, module=AuditLog.Module.MEDICAL_ORDERS, obj=instruction, description="Indicacion medica hospitalaria creada.", new_values={"status": instruction.status, "priority": instruction.priority, "scheduled_doses": len(scheduled)})
        return instruction


def schedule_medication_administrations(instruction, user=None, request=None, horizon_days=7):
    """Create a bounded, idempotent schedule. Stock is never touched here."""
    if instruction.instruction_type != MedicalInstruction.InstructionType.MEDICATION or instruction.as_needed:
        return []
    if instruction.status not in [MedicalInstruction.Status.ACTIVE, MedicalInstruction.Status.ACKNOWLEDGED, MedicalInstruction.Status.IN_PROGRESS]:
        return []
    if not instruction.interval_hours:
        raise ValidationError("La indicacion requiere un intervalo para programar administraciones.")
    start = max(instruction.effective_from, timezone.now())
    horizon = timezone.now() + timedelta(days=max(1, min(int(horizon_days), 14)))
    end = min(instruction.effective_until or horizon, horizon)
    if end < start:
        return []
    scheduled = []
    current = start
    while current <= end and len(scheduled) < 336:
        administration, created = MedicationAdministration.objects.get_or_create(
            instruction=instruction,
            scheduled_time=current,
            defaults={
                "hospitalization": instruction.hospitalization,
                "inventory_item": instruction.inventory_item,
                "medication_name": instruction.inventory_item.name,
                "dosage": f"{instruction.dose} {instruction.dose_unit}".strip(),
                "ordered_dose": instruction.dose,
                "dose_unit": instruction.dose_unit,
                "inventory_quantity": instruction.inventory_quantity,
                "route": instruction.route,
                "status": MedicationAdministration.Status.SCHEDULED,
            },
        )
        if created:
            scheduled.append(administration)
        current += timedelta(hours=instruction.interval_hours)
    return scheduled


def replace_medical_instruction(instruction, doctor, reason, request=None, **payload):
    if len((reason or "").strip()) < 5:
        raise ValidationError("El motivo del cambio debe tener al menos 5 caracteres.")
    with transaction.atomic():
        current = MedicalInstruction.objects.select_for_update().select_related("hospitalization").get(pk=instruction.pk)
        ensure_active_hospitalization(current.hospitalization)
        if current.doctor_id != doctor.id:
            raise ValidationError("Solo el medico responsable puede reemplazar esta indicacion.")
        if current.status in [MedicalInstruction.Status.COMPLETED, MedicalInstruction.Status.SUSPENDED, MedicalInstruction.Status.CANCELLED]:
            raise ValidationError("La indicacion ya fue cerrada.")
        current.status = MedicalInstruction.Status.SUSPENDED
        current.status_reason = reason.strip()
        current.save(update_fields=["status", "status_reason", "actualizado_en"])
        status_time = timezone.now()
        current.administrations.filter(
            status__in=[MedicationAdministration.Status.PENDING, MedicationAdministration.Status.SCHEDULED, MedicationAdministration.Status.DUE, MedicationAdministration.Status.DELAYED]
        ).update(status=MedicationAdministration.Status.CANCELLED, status_recorded_at=status_time, notes=f"Cancelada por reemplazo: {reason}", actualizado_en=status_time)
        values = {
            field.name: getattr(current, field.name)
            for field in MedicalInstruction._meta.fields
            if field.name not in {"id", "creado_en", "actualizado_en", "status", "status_reason", "acknowledged_by", "acknowledged_at", "completed_by", "completed_at", "replaces", "version"}
        }
        values.update(payload)
        values.update(hospitalization=current.hospitalization, doctor=doctor, replaces=current, version=current.version + 1, status=MedicalInstruction.Status.ACTIVE)
        replacement = MedicalInstruction.objects.create(**values)
        schedule_medication_administrations(replacement, user=doctor.user, request=request)
        _log_event(current.hospitalization, "medical_instruction_replaced", "Indicacion medica reemplazada.", user=doctor.user, metadata={"previous": current.id, "replacement": replacement.id})
        log_audit_event(request=request, user=doctor.user, clinic=current.hospitalization.clinic, action=AuditLog.Action.UPDATE, module=AuditLog.Module.MEDICAL_ORDERS, obj=replacement, description="Indicacion medica reemplazada con historial.", old_values={"instruction": current.id, "version": current.version}, new_values={"instruction": replacement.id, "version": replacement.version, "reason": reason})
        return replacement


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
        if status in [MedicalInstruction.Status.SUSPENDED, MedicalInstruction.Status.CANCELLED, MedicalInstruction.Status.COMPLETED]:
            status_time = timezone.now()
            locked.administrations.filter(
                status__in=[MedicationAdministration.Status.PENDING, MedicationAdministration.Status.SCHEDULED, MedicationAdministration.Status.DUE, MedicationAdministration.Status.DELAYED]
            ).update(status=MedicationAdministration.Status.CANCELLED, status_recorded_at=status_time, notes=f"Indicacion {status}: {reason}".strip(), actualizado_en=status_time)
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
    now = timezone.now()
    MedicationAdministration.objects.filter(
        clinic=clinic,
        status=MedicationAdministration.Status.SCHEDULED,
        scheduled_time__lte=now,
        hospitalization__status__in=Hospitalization.ACTIVE_STATUSES,
    ).update(status=MedicationAdministration.Status.DUE, status_recorded_at=now, actualizado_en=now)
    return MedicationAdministration.objects.select_related("clinic", "hospitalization__current_bed__room", "patient", "administered_by", "instruction", "inventory_item").filter(
        clinic=clinic,
        hospitalization__status__in=Hospitalization.ACTIVE_STATUSES,
        status__in=[MedicationAdministration.Status.PENDING, MedicationAdministration.Status.SCHEDULED, MedicationAdministration.Status.DUE, MedicationAdministration.Status.DELAYED],
    ).order_by("scheduled_time", "id")


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
        instruction = payload.get("instruction")
        if not instruction or instruction.hospitalization_id != locked.id or instruction.instruction_type != MedicalInstruction.InstructionType.MEDICATION:
            raise ValidationError("La programacion debe originarse en una indicacion medica activa.")
        if instruction.status not in [MedicalInstruction.Status.ACTIVE, MedicalInstruction.Status.ACKNOWLEDGED, MedicalInstruction.Status.IN_PROGRESS]:
            raise ValidationError("La indicacion medica ya no esta activa.")
        payload.setdefault("inventory_item", instruction.inventory_item)
        payload.setdefault("medication_name", instruction.inventory_item.name)
        payload.setdefault("dosage", f"{instruction.dose} {instruction.dose_unit}".strip())
        payload.setdefault("ordered_dose", instruction.dose)
        payload.setdefault("dose_unit", instruction.dose_unit)
        payload.setdefault("inventory_quantity", instruction.inventory_quantity)
        payload.setdefault("route", instruction.route)
        medication = MedicationAdministration.objects.create(hospitalization=locked, **payload)
        _log_event(locked, "medication_scheduled", "Medicamento programado para administracion.", user=user, metadata={"medication_administration": medication.id, "medication_name": medication.medication_name})
        log_audit_event(request=request, user=user, clinic=locked.clinic, action=AuditLog.Action.CREATE, module=AuditLog.Module.MEDICAL_RECORDS, obj=medication, description="Medicamento hospitalario programado.", new_values={"status": medication.status})
        return medication


def _lock_medication_for_action(medication_administration):
    medication = MedicationAdministration.objects.select_for_update().select_related("hospitalization", "instruction", "inventory_item", "selected_lot").get(pk=medication_administration.pk)
    ensure_active_hospitalization(medication.hospitalization)
    if medication.status in [MedicationAdministration.Status.ADMINISTERED, MedicationAdministration.Status.REVERSED]:
        raise ValidationError("La administracion ya fue registrada.")
    if medication.status in [MedicationAdministration.Status.OMITTED, MedicationAdministration.Status.REFUSED, MedicationAdministration.Status.UNAVAILABLE, MedicationAdministration.Status.CANCELLED]:
        raise ValidationError("Este medicamento ya no permite cambios de administracion.")
    if medication.instruction_id and medication.instruction.status not in [MedicalInstruction.Status.ACTIVE, MedicalInstruction.Status.ACKNOWLEDGED, MedicalInstruction.Status.IN_PROGRESS]:
        raise ValidationError("La indicacion medica ya no esta activa.")
    return medication


def mark_medication_administered(medication_administration, nurse, request=None, notes="", administered_at=None, administered_dose=None, dose_unit="", route="", inventory_quantity=None, selected_lot=None, idempotency_key=""):
    with transaction.atomic():
        medication = MedicationAdministration.objects.select_for_update().select_related("hospitalization", "instruction", "inventory_item", "selected_lot").get(pk=medication_administration.pk)
        key = (idempotency_key or "").strip()[:100]
        if medication.status == MedicationAdministration.Status.ADMINISTERED:
            if key and medication.administration_idempotency_key == key:
                medication._idempotent_replay = True
                return medication
            raise ValidationError("La administracion ya fue registrada.")
        medication = _lock_medication_for_action(medication)
        if not medication.inventory_item_id:
            raise ValidationError("La administracion no tiene un medicamento de inventario asociado.")
        actual_dose = Decimal(administered_dose if administered_dose is not None else medication.ordered_dose or 0)
        quantity = Decimal(inventory_quantity if inventory_quantity is not None else medication.inventory_quantity)
        actual_unit = (dose_unit or medication.dose_unit).strip()
        actual_route = (route or medication.route).strip()
        if actual_dose <= 0 or quantity <= 0 or not actual_unit or not actual_route:
            raise ValidationError("Confirma dosis, unidad, via y cantidad utilizada.")
        usage = consume_inventory_item({
            "clinic": medication.clinic,
            "patient": medication.patient,
            "hospitalization": medication.hospitalization,
            "medication_administration": medication,
            "inventory_item": medication.inventory_item,
            "inventory_lot": selected_lot or medication.selected_lot,
            "quantity": quantity,
            "usage_type": ClinicalSupplyUsage.UsageType.MEDICATION,
            "description": medication.medication_name,
            "notes": notes,
            "billable": True,
            "nurse": nurse,
            "applied_by": nurse,
            "idempotency_key": f"med-admin:{medication.id}",
        })
        old_status = medication.status
        medication.status = MedicationAdministration.Status.ADMINISTERED
        medication.administered_time = administered_at or timezone.now()
        medication.status_recorded_at = timezone.now()
        medication.administered_by = nurse
        medication.administered_dose = actual_dose
        medication.dose_unit = actual_unit
        medication.route = actual_route
        medication.administered_quantity = quantity
        medication.administration_idempotency_key = key
        medication.inventory_processed_at = timezone.now()
        medication.notes = notes or medication.notes
        medication.save(update_fields=["status", "administered_time", "status_recorded_at", "administered_by", "administered_dose", "dose_unit", "route", "administered_quantity", "administration_idempotency_key", "inventory_processed_at", "notes", "actualizado_en"])
        groups = getattr(usage, "_group_usages", [usage])
        _log_event(medication.hospitalization, "medication_administered", "Medicamento administrado.", user=nurse, metadata={"medication_administration": medication.id, "consumptions": [entry.id for entry in groups]})
        log_audit_event(request=request, user=nurse, clinic=medication.clinic, action=AuditLog.Action.COMPLETE, module=AuditLog.Module.MEDICAL_RECORDS, obj=medication, description="Medicamento hospitalario administrado.", old_values={"status": old_status}, new_values={"status": medication.status, "consumptions": [entry.id for entry in groups]})
        medication._idempotent_replay = False
        return medication


def mark_medication_omitted(medication_administration, nurse, request=None, reason="", notes=""):
    if not reason:
        raise ValidationError("El motivo de omision es obligatorio.")
    with transaction.atomic():
        medication = _lock_medication_for_action(medication_administration)
        old_status = medication.status
        medication.status = MedicationAdministration.Status.OMITTED
        medication.status_recorded_at = timezone.now()
        medication.administered_by = nurse
        medication.omission_reason = reason
        medication.notes = notes or medication.notes
        medication.save(update_fields=["status", "status_recorded_at", "administered_by", "omission_reason", "notes", "actualizado_en"])
        _log_event(medication.hospitalization, "medication_omitted", "Medicamento omitido.", user=nurse, metadata={"medication_administration": medication.id, "reason": reason})
        log_audit_event(request=request, user=nurse, clinic=medication.clinic, action=AuditLog.Action.UPDATE, module=AuditLog.Module.MEDICAL_RECORDS, obj=medication, description="Medicamento hospitalario omitido.", old_values={"status": old_status}, new_values={"status": medication.status, "omission_reason": reason})
        return medication


def mark_medication_delayed(medication_administration, nurse, request=None, notes=""):
    if len((notes or "").strip()) < 5:
        raise ValidationError("El motivo del retraso debe tener al menos 5 caracteres.")
    with transaction.atomic():
        medication = _lock_medication_for_action(medication_administration)
        old_status = medication.status
        medication.status = MedicationAdministration.Status.DELAYED
        medication.status_recorded_at = timezone.now()
        medication.administered_by = nurse
        medication.delay_reason = notes.strip()
        medication.notes = notes.strip()
        medication.save(update_fields=["status", "status_recorded_at", "administered_by", "delay_reason", "notes", "actualizado_en"])
        _log_event(medication.hospitalization, "medication_delayed", "Medicamento retrasado.", user=nurse, metadata={"medication_administration": medication.id, "notes": notes})
        log_audit_event(request=request, user=nurse, clinic=medication.clinic, action=AuditLog.Action.UPDATE, module=AuditLog.Module.MEDICAL_RECORDS, obj=medication, description="Medicamento hospitalario retrasado.", old_values={"status": old_status}, new_values={"status": medication.status, "notes": notes})
        return medication


def mark_medication_refused(medication_administration, nurse, reason, request=None, notes=""):
    if len((reason or "").strip()) < 5:
        raise ValidationError("El motivo de rechazo debe tener al menos 5 caracteres.")
    with transaction.atomic():
        medication = _lock_medication_for_action(medication_administration)
        old_status = medication.status
        medication.status = MedicationAdministration.Status.REFUSED
        medication.status_recorded_at = timezone.now()
        medication.administered_by = nurse
        medication.refusal_reason = reason.strip()
        medication.notes = notes or medication.notes
        medication.save(update_fields=["status", "status_recorded_at", "administered_by", "refusal_reason", "notes", "actualizado_en"])
        _log_event(medication.hospitalization, "medication_refused", "Paciente rechazo medicamento.", user=nurse, metadata={"medication_administration": medication.id})
        log_audit_event(request=request, user=nurse, clinic=medication.clinic, action=AuditLog.Action.UPDATE, module=AuditLog.Module.MEDICAL_RECORDS, obj=medication, description="Rechazo de medicamento hospitalario registrado.", old_values={"status": old_status}, new_values={"status": medication.status})
        return medication


def mark_medication_unavailable(medication_administration, nurse, reason, request=None, notes=""):
    if len((reason or "").strip()) < 5:
        raise ValidationError("La observacion de falta de stock debe tener al menos 5 caracteres.")
    with transaction.atomic():
        medication = _lock_medication_for_action(medication_administration)
        old_status = medication.status
        medication.status = MedicationAdministration.Status.UNAVAILABLE
        medication.status_recorded_at = timezone.now()
        medication.administered_by = nurse
        medication.unavailable_reason = reason.strip()
        medication.notes = notes or medication.notes
        medication.save(update_fields=["status", "status_recorded_at", "administered_by", "unavailable_reason", "notes", "actualizado_en"])
        _log_event(medication.hospitalization, "medication_unavailable", "Medicamento no disponible.", user=nurse, metadata={"medication_administration": medication.id})
        log_audit_event(request=request, user=nurse, clinic=medication.clinic, action=AuditLog.Action.UPDATE, module=AuditLog.Module.INVENTORY, obj=medication, description="Falta de existencia para medicamento hospitalario.", old_values={"status": old_status}, new_values={"status": medication.status})
        return medication


def reverse_medication_administration(medication_administration, user, reason, request=None):
    if len((reason or "").strip()) < 5:
        raise ValidationError("El motivo de reversion debe tener al menos 5 caracteres.")
    with transaction.atomic():
        medication = MedicationAdministration.objects.select_for_update().select_related("hospitalization").get(pk=medication_administration.pk)
        if medication.status == MedicationAdministration.Status.REVERSED:
            return medication
        if medication.status != MedicationAdministration.Status.ADMINISTERED:
            raise ValidationError("Solo una administracion confirmada puede revertirse.")
        usages = list(ClinicalSupplyUsage.objects.select_for_update().filter(medication_administration=medication, active=True).select_related("invoice"))
        if not usages:
            raise ValidationError("No se encontro el consumo de inventario asociado.")
        for usage in usages:
            if usage.invoiced or usage.invoice_item_id or (usage.invoice_id and (usage.invoice.is_fiscal or usage.invoice.paid_amount > 0)):
                raise ValidationError("No se puede revertir porque el consumo ya tiene afectacion financiera. Realiza el flujo administrativo correspondiente.")
        for usage in usages:
            usage.cancel(user=user, reason=reason)
        medication.status = MedicationAdministration.Status.REVERSED
        medication.status_recorded_at = timezone.now()
        medication.reversed_at = timezone.now()
        medication.reversed_by = user
        medication.reversal_reason = reason.strip()
        medication.save(update_fields=["status", "status_recorded_at", "reversed_at", "reversed_by", "reversal_reason", "actualizado_en"])
        _log_event(medication.hospitalization, "medication_reversed", "Administracion de medicamento revertida.", user=user, metadata={"medication_administration": medication.id, "consumptions": [usage.id for usage in usages]})
        log_audit_event(request=request, user=user, clinic=medication.clinic, action=AuditLog.Action.CANCEL, module=AuditLog.Module.INVENTORY, obj=medication, description="Administracion de medicamento e inventario revertidos.", new_values={"status": medication.status, "reason": reason})
        return medication
