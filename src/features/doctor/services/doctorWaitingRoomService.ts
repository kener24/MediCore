import { endpoints } from '@/core/api/endpoints';
import { startConsultation as startVisitConsultation } from '@/features/doctor/services/doctorConsultationService';
import { getFirstAvailable } from '@/features/doctor/services/doctorApiHelpers';
import { normalizeListResponse, type ApiListResponse } from '@/features/doctor/types/commonDoctor.types';
import type { WaitingRoomPatient } from '@/features/doctor/types/doctorWaitingRoom.types';

export async function getDoctorWaitingRoom() {
  const data = await getFirstAvailable<ApiListResponse<WaitingRoomPatient>>([
    endpoints.doctor.waitingRoomAlt,
    endpoints.doctor.waitingRoom,
    endpoints.doctor.waitingRoomVisitsAlt,
    endpoints.doctor.visits,
  ]);
  return normalizeListResponse(data);
}

export async function getWaitingRoomPatientDetail(visitId: number | string) {
  return getFirstAvailable<WaitingRoomPatient>([
    endpoints.doctor.visit(visitId),
    `${endpoints.doctor.waitingRoomAlt}${visitId}/`,
    `${endpoints.doctor.waitingRoom}${visitId}/`,
  ]);
}

export async function startConsultation(visitId: number | string) {
  return startVisitConsultation(visitId);
}
