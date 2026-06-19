import api from "./axios";
import type {
  HospitalBed,
  HospitalRoom,
  HospitalVitalSigns,
  Hospitalization,
  HospitalizationCreatePayload,
  HospitalizationDashboard,
  NursingNote,
} from "../types/hospitalization";

export async function getHospitalizationDashboard() {
  const { data } = await api.get<HospitalizationDashboard>("/hospitalization/dashboard/");
  return data;
}

export async function getHospitalizations(filters?: Record<string, string>) {
  const { data } = await api.get<Hospitalization[]>("/hospitalization/admissions/", { params: filters });
  return data;
}

export async function getHospitalization(id: number | string) {
  const { data } = await api.get<Hospitalization>(`/hospitalization/admissions/${id}/`);
  return data;
}

export async function createHospitalization(payload: HospitalizationCreatePayload) {
  const { data } = await api.post<Hospitalization>("/hospitalization/admissions/", payload);
  return data;
}

export async function assignHospitalBed(id: number | string, payload: { bed: number; notes?: string }) {
  const { data } = await api.post<Hospitalization>(`/hospitalization/admissions/${id}/assign-bed/`, payload);
  return data;
}

export async function changeHospitalBed(id: number | string, payload: { bed: number; notes?: string }) {
  const { data } = await api.post<Hospitalization>(`/hospitalization/admissions/${id}/change-bed/`, payload);
  return data;
}

export async function dischargeHospitalization(id: number | string, payload: { discharge_reason?: string; discharge_notes?: string; bed_status?: string }) {
  const { data } = await api.post<Hospitalization>(`/hospitalization/admissions/${id}/discharge/`, payload);
  return data;
}

export async function cancelHospitalization(id: number | string, payload: { reason: string }) {
  const { data } = await api.post<Hospitalization>(`/hospitalization/admissions/${id}/cancel/`, payload);
  return data;
}

export async function getHospitalRooms() {
  const { data } = await api.get<HospitalRoom[]>("/hospitalization/rooms/");
  return data;
}

export async function createHospitalRoom(payload: Partial<HospitalRoom>) {
  const { data } = await api.post<HospitalRoom>("/hospitalization/rooms/", payload);
  return data;
}

export async function getHospitalBeds(filters?: Record<string, string>) {
  const { data } = await api.get<HospitalBed[]>("/hospitalization/beds/", { params: filters });
  return data;
}

export async function createHospitalBed(payload: Partial<HospitalBed>) {
  const { data } = await api.post<HospitalBed>("/hospitalization/beds/", payload);
  return data;
}

export async function getAvailableHospitalBeds() {
  const { data } = await api.get<HospitalBed[]>("/hospitalization/beds/available/");
  return data;
}

export async function createHospitalVitalSigns(id: number | string, payload: Partial<HospitalVitalSigns>) {
  const { data } = await api.post<HospitalVitalSigns>(`/hospitalization/admissions/${id}/vital-signs/`, payload);
  return data;
}

export async function createNursingNote(id: number | string, payload: Partial<NursingNote>) {
  const { data } = await api.post<NursingNote>(`/hospitalization/admissions/${id}/nursing-notes/`, payload);
  return data;
}
