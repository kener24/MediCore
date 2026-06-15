import { endpoints } from '@/core/api/endpoints';
import { getFirstAvailable } from '@/features/doctor/services/doctorApiHelpers';
import { normalizeListResponse, type ApiListResponse } from '@/features/doctor/types/commonDoctor.types';
import type { WaitingRoomPatient } from '@/features/doctor/types/doctorWaitingRoom.types';

export async function getDoctorWaitingRoom() {
  const data = await getFirstAvailable<ApiListResponse<WaitingRoomPatient>>([
    endpoints.doctor.waitingRoomAlt,
    endpoints.doctor.waitingRoom,
  ]);
  return normalizeListResponse(data);
}
