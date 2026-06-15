import { endpoints } from '@/core/api/endpoints';
import { getFirstAvailable } from '@/features/doctor/services/doctorApiHelpers';
import { normalizeListResponse, type ApiListResponse } from '@/features/doctor/types/commonDoctor.types';
import type { DoctorAppointment } from '@/features/doctor/types/doctorSchedule.types';

export async function getDoctorAppointments(date?: string) {
  const data = await getFirstAvailable<ApiListResponse<DoctorAppointment>>(
    [endpoints.doctor.appointments, endpoints.doctor.scheduleToday],
    { params: date ? { date } : undefined },
  );
  return normalizeListResponse(data);
}
