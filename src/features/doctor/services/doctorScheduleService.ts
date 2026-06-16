import { endpoints } from '@/core/api/endpoints';
import { getFirstAvailable } from '@/features/doctor/services/doctorApiHelpers';
import { normalizeListResponse, type ApiListResponse } from '@/features/doctor/types/commonDoctor.types';
import type { DoctorAppointment } from '@/features/doctor/types/doctorSchedule.types';

export async function getDoctorAppointments(date?: string) {
  try {
    const data = await getFirstAvailable<ApiListResponse<DoctorAppointment>>(
      [
        endpoints.doctor.appointments,
        endpoints.doctor.scheduleToday,
        endpoints.doctor.appointmentsDoctorAlt,
      ],
      { params: date ? { date } : undefined },
    );
    return filterAppointmentsByDate(normalizeListResponse(data), date);
  } catch {
    const data = await getFirstAvailable<ApiListResponse<DoctorAppointment>>(
      [endpoints.doctor.appointmentsAlt],
      { params: date ? { date } : undefined },
    );
    return filterAppointmentsByDate(normalizeListResponse(data), date);
  }
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

function filterAppointmentsByDate(items: DoctorAppointment[], date?: string) {
  if (!date) return items;
  return items.filter((item) => (item.scheduled_date ?? item.fecha) === date);
}
