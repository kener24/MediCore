import { apiClient } from '@/core/api/apiClient';
import { endpoints } from '@/core/api/endpoints';
import { normalizeList, type ListResponse } from '@/features/patient/types/pagination.types';
import type {
  AppointmentAvailability,
  CancelAppointmentPayload,
  PatientAppointment,
  PatientAppointmentRequestPayload,
  PatientDoctor,
  PatientSpecialty,
} from '@/features/patient/types/patientAppointments.types';

export async function getPatientAppointments(params?: Record<string, string>) {
  const { data } = await apiClient.get<ListResponse<PatientAppointment>>(
    endpoints.patientPortal.appointments,
    { params },
  );
  return normalizeList(data);
}

export async function getPatientAppointment(id: number | string) {
  const { data } = await apiClient.get<PatientAppointment>(endpoints.patientPortal.appointment(id));
  return data;
}

export const getPatientAppointmentDetail = getPatientAppointment;

export async function requestPatientAppointment(payload: PatientAppointmentRequestPayload) {
  const { data } = await apiClient.post<PatientAppointment>(
    endpoints.patientPortal.requestAppointment,
    payload,
  );
  return data;
}

export const requestAppointment = requestPatientAppointment;

export async function cancelPatientAppointment(id: number | string, reason: string) {
  const { data } = await apiClient.patch<PatientAppointment>(
    endpoints.patientPortal.cancelAppointment(id),
    { reason },
  );
  return data;
}

export function cancelAppointment(id: number | string, payload: CancelAppointmentPayload) {
  return cancelPatientAppointment(id, payload.reason);
}

export async function getPatientSpecialties() {
  const { data } = await apiClient.get<ListResponse<PatientSpecialty>>(
    endpoints.patientPortal.specialties,
  );
  return normalizeList(data);
}

export const getSpecialties = getPatientSpecialties;

export async function getPatientDoctors(specialty?: number | string) {
  const { data } = await apiClient.get<ListResponse<PatientDoctor>>(endpoints.patientPortal.doctors, {
    params: specialty ? { specialty } : undefined,
  });
  return normalizeList(data);
}

export const getDoctors = getPatientDoctors;

export async function getPatientDoctorAvailability(doctorId: number | string, date: string) {
  const { data } = await apiClient.get<AppointmentAvailability>(
    endpoints.patientPortal.doctorAvailability(doctorId),
    { params: { date } },
  );
  return data;
}

export const getDoctorAvailability = getPatientDoctorAvailability;
