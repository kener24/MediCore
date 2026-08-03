import api from "./axios";
import type { Clinic, ClinicPayload } from "../types/clinic";

export interface ClinicFilters {
  search?: string;
  is_active?: string;
  plan?: string;
  subscription?: string;
}

export async function getClinics(filters?: ClinicFilters) {
  const { data } = await api.get<Clinic[]>("/clinics/", { params: filters });
  return data;
}

export async function getClinic(id: string | number) {
  const { data } = await api.get<Clinic>(`/clinics/${id}/`);
  return data;
}

export async function createClinic(payload: ClinicPayload, idempotencyKey = crypto.randomUUID()) {
  const { data } = await api.post<Clinic>("/clinics/", payload, { headers: { "Idempotency-Key": idempotencyKey } });
  return data;
}

export async function updateClinic(id: string | number, payload: Partial<ClinicPayload>) {
  const { data } = await api.patch<Clinic>(`/clinics/${id}/`, payload);
  return data;
}

export async function activateClinic(id: string | number, reason: string) {
  const { data } = await api.patch<Clinic>(`/clinics/${id}/activate/`, { reason });
  return data;
}

export async function deactivateClinic(id: string | number, reason: string) {
  const { data } = await api.patch<Clinic>(`/clinics/${id}/deactivate/`, { reason });
  return data;
}
