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
import { mapDashboard, mapNotification, mapNursePatient, mapTriage, mapVitalSigns } from '@/features/nurse/utils/nurseMappers';

const queueEndpoints = ['/nurse/triage/queue/', '/triage/queue/', '/clinic/triage/queue/', '/visits/triage-queue/', endpoints.doctor.visits];
const inTriageEndpoints = ['/nurse/triage/in-progress/', '/triage/in-progress/', '/visits/?status=in_triage'];
const completedEndpoints = ['/nurse/triage/completed/', '/triage/completed/', '/triages/?status=completed'];
const dashboardEndpoints = ['/nurse/dashboard/', '/triage/dashboard/', '/clinic/nurse/dashboard/'];
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
      priorityCount: queue.filter((item) => ['critical', 'urgent', 'critica', 'urgente'].includes(String(item.priority))).length,
      unreadNotifications: unread,
    };
  }
}

export async function getTriageQueue(): Promise<NursePatientSummary[]> {
  const data = await getFirstAvailable<ApiListResponse<unknown> | unknown[]>(queueEndpoints);
  return normalizeListResponse(data).map(mapNursePatient);
}

export async function getPatientsInTriage(): Promise<NursePatientSummary[]> {
  const data = await getFirstAvailable<ApiListResponse<unknown> | unknown[]>(inTriageEndpoints);
  return normalizeListResponse(data).map(mapNursePatient);
}

export async function getCompletedTriages(): Promise<NurseTriage[]> {
  const data = await getFirstAvailable<ApiListResponse<unknown> | unknown[]>(completedEndpoints);
  return normalizeListResponse(data).map(mapTriage);
}

export async function getNursePatientDetail(visitId: number | string): Promise<NursePatientSummary> {
  const data = await getFirstAvailable([`/nurse/triage/queue/${visitId}/`, `/triage/queue/${visitId}/`, endpoints.doctor.visit(visitId), `/visits/${visitId}/`, `/admissions/${visitId}/`]);
  return mapNursePatient(data);
}

export async function getLatestVitalSigns(visitId: number | string): Promise<NurseVitalSigns | null> {
  const data = await getFirstAvailable<ApiListResponse<unknown> | unknown[]>([
    `/nurse/triage/${visitId}/vital-signs/`,
    `/triage/${visitId}/vital-signs/`,
    endpoints.doctor.vitalSigns(visitId),
    `/vital-signs/?visit=${visitId}`,
    `/clinical/vital-signs/?visit=${visitId}`,
  ]);
  const rows = normalizeListResponse(data);
  return rows.length ? mapVitalSigns(rows[0]) : mapVitalSigns(data);
}

export async function startTriage(visitId: number | string): Promise<NursePatientSummary> {
  const data = await postFirstAvailable([`/nurse/triage/${visitId}/start/`, `/triage/${visitId}/start/`, `/visits/${visitId}/start-triage/`]);
  return mapNursePatient(data);
}

export async function createVitalSigns(payload: VitalSignsPayload): Promise<NurseVitalSigns> {
  const data = await postFirstAvailable([endpoints.doctor.vitalSigns(payload.visit), '/nurse/vital-signs/', '/triage/vital-signs/', '/vital-signs/', '/clinical/vital-signs/'], payload);
  return mapVitalSigns(data);
}

export async function completeTriage(payload: CompleteTriagePayload): Promise<NurseTriage> {
  const data = await postFirstAvailable(
    [`/nurse/triage/${payload.visit}/complete/`, `/triage/${payload.visit}/complete/`, endpoints.doctor.triage(payload.visit), `/visits/${payload.visit}/complete-triage/`, '/triages/'],
    payload,
  );
  return mapTriage(data);
}

export async function getTriageDetail(triageId: number | string): Promise<NurseTriage> {
  const data = await getFirstAvailable([`/nurse/triage/${triageId}/`, `/triage/${triageId}/`, `/triages/${triageId}/`]);
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
