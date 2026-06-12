import api from "./axios";
import type { DoctorDashboard, DoctorPayload, DoctorProfile, DoctorSchedule, DoctorSchedulePayload, MedicalSpecialty } from "../types/doctor";

export interface DoctorFilters {
  specialty?: string;
  is_active?: string;
  search?: string;
}

export async function getSpecialties(filters?: { search?: string; is_active?: string }) {
  const { data } = await api.get<MedicalSpecialty[]>("/specialties/", { params: filters });
  return data;
}

export async function createSpecialty(payload: Partial<MedicalSpecialty>) {
  const { data } = await api.post<MedicalSpecialty>("/specialties/", payload);
  return data;
}

export async function updateSpecialty(id: number | string, payload: Partial<MedicalSpecialty>) {
  const { data } = await api.patch<MedicalSpecialty>(`/specialties/${id}/`, payload);
  return data;
}

export async function deactivateSpecialty(id: number | string) {
  await api.delete(`/specialties/${id}/`);
}

export async function getDoctors(filters?: DoctorFilters) {
  const { data } = await api.get<DoctorProfile[]>("/doctors/", { params: filters });
  return data;
}

export async function getDoctor(id: number | string) {
  const { data } = await api.get<DoctorProfile>(`/doctors/${id}/`);
  return data;
}

export async function createDoctor(payload: DoctorPayload) {
  const { data } = await api.post<DoctorProfile>("/doctors/", payload);
  return data;
}

export async function updateDoctor(id: number | string, payload: Partial<DoctorPayload>) {
  const { data } = await api.patch<DoctorProfile>(`/doctors/${id}/`, payload);
  return data;
}

export async function deactivateDoctor(id: number | string) {
  await api.delete(`/doctors/${id}/`);
}

export async function getMyDoctorProfile() {
  const { data } = await api.get<DoctorProfile>("/doctors/me/");
  return data;
}

export async function getDoctorSchedules(doctorId: number | string) {
  const { data } = await api.get<DoctorSchedule[]>(`/doctors/${doctorId}/schedules/`);
  return data;
}

export async function createDoctorSchedule(doctorId: number | string, payload: DoctorSchedulePayload) {
  const { data } = await api.post<DoctorSchedule>(`/doctors/${doctorId}/schedules/`, payload);
  return data;
}

export async function updateDoctorSchedule(doctorId: number | string, scheduleId: number | string, payload: Partial<DoctorSchedulePayload>) {
  const { data } = await api.patch<DoctorSchedule>(`/doctors/${doctorId}/schedules/${scheduleId}/`, payload);
  return data;
}

export async function deleteDoctorSchedule(doctorId: number | string, scheduleId: number | string) {
  await api.delete(`/doctors/${doctorId}/schedules/${scheduleId}/`);
}

export async function getDoctorDashboard() {
  const { data } = await api.get<DoctorDashboard>("/doctor/dashboard/");
  return data;
}

