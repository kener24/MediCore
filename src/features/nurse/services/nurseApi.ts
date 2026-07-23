import { endpoints } from '@/core/api/endpoints';
import { getFirstAvailable, patchFirstAvailable, postFirstAvailable } from '@/features/doctor/services/doctorApiHelpers';
import type {
  ApiListResponse,
  CompleteTriagePayload,
  NurseDashboardSummary,
  NurseNotification,
  NursePatientSummary,
  NurseTriage,
  NurseVitalSigns,
  VitalSignsPayload,
} from '@/features/nurse/types/nurse.types';
import { normalizeListResponse } from '@/features/nurse/types/nurse.types';
import { readNurseCache, saveNurseCache } from '@/features/nurse/utils/nurseCache';
import { mapDashboard, mapNotification, mapNursePatient, mapTriage, mapVitalSigns } from '@/features/nurse/utils/nurseMappers';

const queueEndpoints = ['/nursing/triage-queue/', '/admissions/triage-queue/', '/admissions/visits/triage-queue/', '/nurse/triage/queue/', '/triage/queue/'];
const inTriageEndpoints = ['/admissions/visits/?status=in_triage', '/nursing/triage-queue/', '/admissions/triage-queue/', '/nurse/triage/in-progress/', '/triage/in-progress/'];
const completedEndpoints = ['/admissions/visits/?status=waiting_doctor&triage_completed=true', '/nurse/triage/completed/', '/triage/completed/', '/triages/?status=completed'];
const dashboardEndpoints = ['/nursing/dashboard/', '/nurse/dashboard/', '/triage/dashboard/', '/clinic/nurse/dashboard/'];
const notificationEndpoints = ['/notifications/', '/nurse/notifications/'];
const unreadEndpoints = ['/notifications/unread-count/', '/nurse/notifications/unread-count/'];

export async function getNurseDashboard(): Promise<NurseDashboardSummary> {
  try {
    return mapDashboard(await getFirstAvailable(dashboardEndpoints));
  } catch {
    const [queue, inTriage, completed, unread] = await Promise.all([
      getTriageQueue().catch(() => []),
      getPatientsInTriage().catch(() => []),
      getCompletedTriages().catch(() => []),
      getUnreadNotificationsCount().catch(() => 0),
    ]);
    return {
      waitingCount: queue.length,
      inTriageCount: inTriage.length,
      completedTodayCount: completed.length,
      priorityCount: queue.filter((item) => ['emergency', 'urgent', 'priority'].includes(String(item.priority))).length,
      unreadNotifications: unread,
    };
  }
}

export async function getTriageQueue(): Promise<NursePatientSummary[]> {
  try {
    const data = await getFirstAvailable<ApiListResponse<unknown> | unknown[]>(queueEndpoints);
    const rows = normalizeListResponse(data).map(mapNursePatient);
    await saveNurseCache('triageQueue', rows);
    return rows;
  } catch (error) {
    const cached = await readNurseCache<NursePatientSummary[]>('triageQueue');
    if (cached) return cached.value;
    throw error;
  }
}

export async function getPatientsInTriage(): Promise<NursePatientSummary[]> {
  try {
    const data = await getFirstAvailable<ApiListResponse<unknown> | unknown[]>(inTriageEndpoints);
    const rows = normalizeListResponse(data).map(mapNursePatient);
    await saveNurseCache('patientsInTriage', rows);
    return rows;
  } catch (error) {
    const cached = await readNurseCache<NursePatientSummary[]>('patientsInTriage');
    if (cached) return cached.value;
    throw error;
  }
}

export async function getCompletedTriages(): Promise<NurseTriage[]> {
  try {
    const data = await getFirstAvailable<ApiListResponse<unknown> | unknown[]>(completedEndpoints);
    const rows = normalizeListResponse(data).map(mapTriage);
    await saveNurseCache('completedTriages', rows);
    return rows;
  } catch (error) {
    const cached = await readNurseCache<NurseTriage[]>('completedTriages');
    if (cached) return cached.value;
    throw error;
  }
}

export async function getNursePatientDetail(visitId: number | string): Promise<NursePatientSummary> {
  const data = await getFirstAvailable([endpoints.doctor.visit(visitId), `/nursing/visits/${visitId}/`, `/nurse/triage/queue/${visitId}/`, `/triage/queue/${visitId}/`, `/visits/${visitId}/`, `/admissions/${visitId}/`]);
  return mapNursePatient(data);
}

export async function getLatestVitalSigns(visitId: number | string): Promise<NurseVitalSigns | null> {
  const data = await getFirstAvailable<ApiListResponse<unknown> | unknown[]>([
    `/nursing/visits/${visitId}/vital-signs/`,
    endpoints.doctor.vitalSigns(visitId),
    `/nurse/triage/${visitId}/vital-signs/`,
    `/triage/${visitId}/vital-signs/`,
    `/vital-signs/?visit=${visitId}`,
    `/clinical/vital-signs/?visit=${visitId}`,
  ]);
  const rows = normalizeListResponse(data);
  return rows.length ? mapVitalSigns(rows[0]) : null;
}

export async function startTriage(visitId: number | string): Promise<NursePatientSummary> {
  const data = await postFirstAvailable([`/nursing/visits/${visitId}/start-triage/`, `/admissions/visits/${visitId}/start-triage/`, `/nurse/triage/${visitId}/start/`, `/triage/${visitId}/start/`, `/visits/${visitId}/start-triage/`]);
  return mapNursePatient(data);
}

function normalizeVitalSignsPayload(payload: VitalSignsPayload) {
  const heightInput = payload.height_cm;
  const height = heightInput ? (heightInput > 3 ? Number((heightInput / 100).toFixed(2)) : heightInput) : undefined;
  return {
    temperature: payload.temperature,
    heart_rate: payload.heart_rate,
    respiratory_rate: payload.respiratory_rate,
    blood_pressure_systolic: payload.systolic_pressure,
    blood_pressure_diastolic: payload.diastolic_pressure,
    oxygen_saturation: payload.oxygen_saturation,
    weight: payload.weight_kg,
    height,
    glucose: payload.glucose,
    pain_scale: payload.pain_scale,
    notes: payload.notes?.trim() ?? '',
    confirm_out_of_range: payload.confirm_out_of_range ?? false,
  };
}

export async function createVitalSigns(payload: VitalSignsPayload): Promise<NurseVitalSigns> {
  const data = await postFirstAvailable([`/nursing/visits/${payload.visit}/vital-signs/`, endpoints.doctor.vitalSigns(payload.visit), '/nurse/vital-signs/', '/triage/vital-signs/', '/vital-signs/', '/clinical/vital-signs/'], normalizeVitalSignsPayload(payload));
  return mapVitalSigns(data);
}

export async function completeTriage(payload: CompleteTriagePayload): Promise<NurseTriage> {
  const data = await postFirstAvailable(
    [`/nursing/visits/${payload.visit}/complete-triage/`, `/admissions/visits/${payload.visit}/complete-triage/`, `/nurse/triage/${payload.visit}/complete/`, `/triage/${payload.visit}/complete/`, endpoints.doctor.triage(payload.visit), `/visits/${payload.visit}/complete-triage/`, '/triages/'],
    payload,
  );
  return mapTriage(data);
}

export async function getTriageDetail(triageId: number | string): Promise<NurseTriage> {
  const data = await getFirstAvailable([endpoints.doctor.visit(triageId), `/nursing/visits/${triageId}/`, `/nurse/triage/${triageId}/`, `/triage/${triageId}/`, `/triages/${triageId}/`]);
  return mapTriage(data);
}

export async function getNurseNotifications(): Promise<NurseNotification[]> {
  const data = await getFirstAvailable<ApiListResponse<unknown> | unknown[]>(notificationEndpoints);
  return normalizeListResponse(data).map(mapNotification);
}

export async function getUnreadNotificationsCount(): Promise<number> {
  const data = (await getFirstAvailable(unreadEndpoints)) as Record<string, unknown>;
  return Number(data.count ?? data.unread ?? data.total ?? 0);
}

export async function markNurseNotificationRead(id: number | string) {
  return patchFirstAvailable([`/notifications/${id}/mark-read/`, `/nurse/notifications/${id}/mark-read/`]);
}
