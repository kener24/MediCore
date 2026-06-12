import api from "./axios";
import type { Appointment, AppointmentAvailability, AppointmentFilters, AppointmentPayload, AppointmentStats } from "../types/appointment";

export async function getAppointments(filters?: AppointmentFilters) {
  const { data } = await api.get<Appointment[]>("/appointments/", { params: filters });
  return data;
}

export async function getAppointment(id: number | string) {
  const { data } = await api.get<Appointment>(`/appointments/${id}/`);
  return data;
}

export async function createAppointment(payload: AppointmentPayload) {
  const { data } = await api.post<Appointment>("/appointments/", payload);
  return data;
}

export async function updateAppointment(id: number | string, payload: Partial<AppointmentPayload>) {
  const { data } = await api.patch<Appointment>(`/appointments/${id}/`, payload);
  return data;
}

export async function confirmAppointment(id: number | string) {
  const { data } = await api.patch<Appointment>(`/appointments/${id}/confirm/`);
  return data;
}

export async function cancelAppointment(id: number | string, cancellation_reason: string) {
  const { data } = await api.patch<Appointment>(`/appointments/${id}/cancel/`, { cancellation_reason });
  return data;
}

export async function markAppointmentAttended(id: number | string) {
  const { data } = await api.patch<Appointment>(`/appointments/${id}/mark-attended/`);
  return data;
}

export async function markAppointmentNoShow(id: number | string) {
  const { data } = await api.patch<Appointment>(`/appointments/${id}/mark-no-show/`);
  return data;
}

export async function rescheduleAppointment(id: number | string, payload: Partial<AppointmentPayload>) {
  const { data } = await api.patch<Appointment>(`/appointments/${id}/reschedule/`, payload);
  return data;
}

export async function getAppointmentAvailability(doctor: number | string, date: string) {
  const { data } = await api.get<AppointmentAvailability>("/appointments/availability/", { params: { doctor, date } });
  return data;
}

export async function getMyDoctorAppointments(filters?: AppointmentFilters) {
  const { data } = await api.get<Appointment[]>("/appointments/my-appointments/", { params: filters });
  return data;
}

export async function getMyPatientAppointments(filters?: AppointmentFilters) {
  const { data } = await api.get<Appointment[]>("/appointments/my-patient-appointments/", { params: filters });
  return data;
}

export async function getAppointmentStats(filters?: AppointmentFilters) {
  const { data } = await api.get<AppointmentStats>("/appointments/stats/", { params: filters });
  return data;
}
