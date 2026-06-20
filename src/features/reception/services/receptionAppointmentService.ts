import { getFirstAvailable, postFirstAvailable } from '@/features/reception/services/receptionApiHelpers';
import { normalizeListResponse, type ApiListResponse, type QueryParams } from '@/features/reception/types/commonReception.types';
import type { ReceptionVisit } from '@/features/reception/types/receptionAdmission.types';
import type { ReceptionAppointment } from '@/features/reception/types/receptionAppointment.types';

export type AppointmentCheckInResult = {
  appointmentOnly?: boolean;
  message?: string;
  raw?: unknown;
  visit?: ReceptionVisit;
  visitId?: number;
};

export async function getTodayAppointments(params?: QueryParams): Promise<ReceptionAppointment[]> {
  const data = await getFirstAvailable<ApiListResponse<ReceptionAppointment>>(
    ['/appointments/today/', '/reception/appointments/today/', '/appointments/'],
    { date: 'today', today: true, ...(params ?? {}) },
  );
  return normalizeListResponse<ReceptionAppointment>(data);
}

export async function getAppointmentDetail(appointmentId: number | string): Promise<ReceptionAppointment> {
  return getFirstAvailable<ReceptionAppointment>([`/appointments/${appointmentId}/`]);
}

export async function checkInAppointment(appointmentId: number | string, payload?: { priority?: string; symptoms?: string }): Promise<AppointmentCheckInResult> {
  const data = await postFirstAvailable<unknown>(
    [
      '/admissions/visits/check-in-appointment/',
      '/admissions/check-in-appointment/',
      `/appointments/${appointmentId}/check-in/`,
      `/admissions/appointments/${appointmentId}/check-in/`,
      `/reception/appointments/${appointmentId}/check-in/`,
    ],
    { appointment: appointmentId, priority: payload?.priority ?? 'normal', symptoms: payload?.symptoms ?? '' },
  );
  return mapCheckInResponse(data);
}

function mapCheckInResponse(response: unknown): AppointmentCheckInResult {
  const root = asRecord(response);
  const visit = firstRecord(root.visit, root.visita, root.admission, root.admision, root.patient_visit);
  const directVisit = looksLikeVisit(root) ? root : null;
  const visitId = numberValue(root.visit_id, root.visita_id, root.admission_id, root.admision_id, root.check_in_visit_id, visit?.id);
  const appointment = firstRecord(root.appointment, root.cita);

  if (visit) return { raw: response, visit: visit as ReceptionVisit, visitId: numberValue(visit.id) };
  if (directVisit) return { raw: response, visit: directVisit as ReceptionVisit, visitId: numberValue(directVisit.id) };
  if (visitId) return { raw: response, visitId };
  if (appointment || looksLikeAppointment(root)) {
    return {
      appointmentOnly: true,
      message: 'Check-in realizado. El servidor no devolvio la visita creada.',
      raw: response,
    };
  }
  return { appointmentOnly: true, message: 'Check-in realizado.', raw: response };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function firstRecord(...values: unknown[]) {
  for (const value of values) {
    const record = asRecord(value);
    if (Object.keys(record).length) return record;
  }
  return null;
}

function numberValue(...values: unknown[]) {
  for (const value of values) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) return numeric;
  }
  return undefined;
}

function looksLikeVisit(value: Record<string, unknown>) {
  return Boolean(value.id && (value.patient_name || value.patient_nombre || value.visit_number || value.visit_type || value.reason || value.status));
}

function looksLikeAppointment(value: Record<string, unknown>) {
  return Boolean(value.id && (value.scheduled_time || value.datetime || value.doctor_name || value.patient_name || value.motivo));
}
