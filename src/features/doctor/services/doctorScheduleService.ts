import { endpoints } from '@/core/api/endpoints';
import { getFirstAvailable } from '@/features/doctor/services/doctorApiHelpers';
import { normalizeListResponse, type ApiListResponse } from '@/features/doctor/types/commonDoctor.types';
import type { DoctorAppointment } from '@/features/doctor/types/doctorSchedule.types';

export async function getDoctorAppointments(date?: string) {
  const data = await getFirstAvailable<ApiListResponse<DoctorAppointment>>(
    [
      endpoints.doctor.appointments,
      endpoints.doctor.scheduleToday,
      endpoints.doctor.appointmentsDoctorAlt,
      endpoints.doctor.appointmentsAlt,
    ],
    { params: date ? { date, doctor: 'current' } : { doctor: 'current' } },
  );
  return normalizeListResponse(data);
}

export async function getDoctorAppointmentsByDate(date: string) {
  return getDoctorAppointments(date);
}

export async function getDoctorTodayAppointments() {
  return getDoctorAppointments();
}

export async function getDoctorAppointmentDetail(id: number | string) {
  return getFirstAvailable<DoctorAppointment>([
    endpoints.doctor.appointment(id),
    `${endpoints.doctor.appointments}${id}/`,
    `${endpoints.doctor.appointmentsAlt}${id}/`,
  ]);
}
