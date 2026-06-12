import api from "./axios";
import type { Clinic, ClinicPayload } from "../types/clinic";

export interface ClinicFilters {
  search?: string;
  is_active?: string;
}

export async function getClinics(filters?: ClinicFilters) {
  const { data } = await api.get<Clinic[]>("/clinics/", { params: filters });
  return data;
}

export async function getClinic(id: string | number) {
  const { data } = await api.get<Clinic>(`/clinics/${id}/`);
  return data;
}

export async function createClinic(payload: ClinicPayload) {
  const { data } = await api.post<Clinic>("/clinics/", payload);
  return data;
}

export async function updateClinic(id: string | number, payload: Partial<ClinicPayload>) {
  const { data } = await api.patch<Clinic>(`/clinics/${id}/`, payload);
  return data;
}

export async function activateClinic(id: string | number) {
  const { data } = await api.patch<Clinic>(`/clinics/${id}/activate/`);
  return data;
}

export async function deactivateClinic(id: string | number) {
  const { data } = await api.patch<Clinic>(`/clinics/${id}/deactivate/`);
  return data;
}
