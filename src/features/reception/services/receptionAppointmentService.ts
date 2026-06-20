import { getFirstAvailable, postFirstAvailable } from '@/features/reception/services/receptionApiHelpers';
import { normalizeListResponse, type ApiListResponse, type QueryParams } from '@/features/reception/types/commonReception.types';
import type { ReceptionVisit } from '@/features/reception/types/receptionAdmission.types';
import type { ReceptionAppointment } from '@/features/reception/types/receptionAppointment.types';

export async function getTodayAppointments(params?: QueryParams): Promise<ReceptionAppointment[]> {
  const data = await getFirstAvailable<ApiListResponse<ReceptionAppointment>>(['/appointments/'], { date: 'today', today: true, ...(params ?? {}) });
  return normalizeListResponse<ReceptionAppointment>(data);
}

export async function getAppointmentDetail(appointmentId: number | string): Promise<ReceptionAppointment> {
  return getFirstAvailable<ReceptionAppointment>([`/appointments/${appointmentId}/`]);
}

export async function checkInAppointment(appointmentId: number | string, payload?: { priority?: string; symptoms?: string }): Promise<ReceptionVisit> {
  return postFirstAvailable<ReceptionVisit>(
    [`/appointments/${appointmentId}/check-in/`, `/admissions/appointments/${appointmentId}/check-in/`, `/admissions/visits/check-in-appointment/`, `/admissions/check-in-appointment/`],
    { appointment: appointmentId, priority: payload?.priority ?? 'normal', symptoms: payload?.symptoms ?? '' },
  );
}
