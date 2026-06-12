import api from "./axios";
import type { Patient, PatientFilters, PatientPayload, PatientStats } from "../types/patient";

export async function getPatients(filters?: PatientFilters) {
  const { data } = await api.get<Patient[]>("/patients/", { params: filters });
  return data;
}

export async function getPatient(id: number | string) {
  const { data } = await api.get<Patient>(`/patients/${id}/`);
  return data;
}

export async function createPatient(payload: PatientPayload) {
  const { data } = await api.post<Patient>("/patients/", payload);
  return data;
}

export async function updatePatient(id: number | string, payload: PatientPayload) {
  const { data } = await api.patch<Patient>(`/patients/${id}/`, payload);
  return data;
}

export async function activatePatient(id: number | string) {
  const { data } = await api.patch<Patient>(`/patients/${id}/activate/`);
  return data;
}

export async function deactivatePatient(id: number | string) {
  const { data } = await api.patch<Patient>(`/patients/${id}/deactivate/`);
  return data;
}

export async function getPatientStats(filters?: PatientFilters) {
  const { data } = await api.get<PatientStats>("/patients/stats/", { params: filters });
  return data;
}

export async function getMyPatientProfile() {
  const { data } = await api.get<Patient>("/patients/me/");
  return data;
}

