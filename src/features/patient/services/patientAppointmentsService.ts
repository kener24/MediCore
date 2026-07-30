import { apiClient } from '@/core/api/apiClient';
import { endpoints } from '@/core/api/endpoints';
import { normalizeList, type ListResponse } from '@/features/patient/types/pagination.types';
import type {
  AppointmentAvailability,
  AppointmentAvailabilitySlot,
  CancelAppointmentPayload,
  PatientAppointment,
  PatientAppointmentRequestPayload,
  PatientDoctor,
  PatientSpecialty,
  RescheduleAppointmentPayload,
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

export async function requestPatientAppointment(payload: PatientAppointmentRequestPayload, idempotencyKey?: string) {
  const { data } = await apiClient.post<PatientAppointment>(
    endpoints.patientPortal.requestAppointment,
    payload,
    idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined,
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

export async function reschedulePatientAppointment(
  id: number | string,
  payload: RescheduleAppointmentPayload,
  idempotencyKey?: string,
) {
  const { data } = await apiClient.post<PatientAppointment>(
    endpoints.patientPortal.rescheduleAppointment(id),
    payload,
    idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined,
  );
  return data;
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

export async function getPatientDoctorAvailability(doctorId: number | string, date: string, modality = 'presencial') {
  const { data } = await apiClient.get<AppointmentAvailability>(
    endpoints.patientPortal.doctorAvailability(doctorId),
    { params: { date, modality } },
  );
  return normalizeAvailability(data);
}

export const getDoctorAvailability = getPatientDoctorAvailability;

function normalizeAvailability(data: AppointmentAvailability | AppointmentAvailabilitySlot[]): AppointmentAvailability {
  if (Array.isArray(data)) return { available_slots: data, booked_slots: [] };
  return {
    ...data,
    available_slots: normalizeSlots(data.available_slots),
    booked_slots: normalizeSlots(data.booked_slots),
  };
}

function normalizeSlots(slots?: AppointmentAvailabilitySlot[]) {
  if (!Array.isArray(slots)) return [];
  return slots
    .map((slot) => ({
      ...slot,
      start_time: normalizeTime(slot.start_time),
      end_time: slot.end_time ? normalizeTime(slot.end_time) : undefined,
      available: slot.available,
    }))
    .filter((slot) => Boolean(slot.start_time));
}

function normalizeTime(value?: string) {
  if (!value) return '';
  const match = String(value).match(/^(\d{2}:\d{2})/);
  return match ? match[1] : String(value);
}
