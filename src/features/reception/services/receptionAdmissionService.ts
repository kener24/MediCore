import { getFirstAvailable, patchFirstAvailable, postFirstAvailable } from '@/features/reception/services/receptionApiHelpers';
import { normalizeListResponse, type ApiListResponse, type QueryParams } from '@/features/reception/types/commonReception.types';
import type { CreateAdmissionPayload, ReceptionStats, ReceptionVisit } from '@/features/reception/types/receptionAdmission.types';

function createPayload(payload: CreateAdmissionPayload) {
  return {
    patient: payload.patient_id,
    appointment: payload.appointment_id || undefined,
    visit_type: payload.visit_type ?? 'walk_in',
    reason: payload.reason?.trim(),
    priority: payload.priority ?? 'normal',
    assigned_doctor: payload.doctor_id || undefined,
  };
}

export async function getTodayAdmissions(params?: QueryParams): Promise<ReceptionVisit[]> {
  const data = await getFirstAvailable<ApiListResponse<ReceptionVisit>>(['/admissions/visits/'], { today: true, ...(params ?? {}) });
  return normalizeListResponse<ReceptionVisit>(data);
}

export async function getTodayReceptionStats(): Promise<ReceptionStats> {
  return getFirstAvailable<ReceptionStats>(['/admissions/visits/stats-today/', '/admissions/stats/today/']);
}

export async function createAdmission(payload: CreateAdmissionPayload): Promise<ReceptionVisit> {
  return postFirstAvailable<ReceptionVisit>(['/admissions/visits/', '/reception/visits/walk-in/'], createPayload(payload));
}

export async function getVisitDetail(visitId: number | string): Promise<ReceptionVisit> {
  return getFirstAvailable<ReceptionVisit>([`/admissions/visits/${visitId}/`]);
}

export async function sendToTriage(visitId: number | string): Promise<ReceptionVisit> {
  return patchFirstAvailable<ReceptionVisit>([`/admissions/visits/${visitId}/`, `/reception/visits/${visitId}/send-to-triage/`], { status: 'waiting_triage' });
}

export async function sendToDoctor(visitId: number | string): Promise<ReceptionVisit> {
  return patchFirstAvailable<ReceptionVisit>([`/admissions/visits/${visitId}/`, `/reception/visits/${visitId}/send-to-doctor/`], { status: 'waiting_doctor' });
}

export async function cancelAdmission(visitId: number | string, reason: string): Promise<ReceptionVisit> {
  return patchFirstAvailable<ReceptionVisit>([`/admissions/visits/${visitId}/`, `/reception/visits/${visitId}/cancel/`], { status: 'cancelled', cancellation_reason: reason.trim() });
}
