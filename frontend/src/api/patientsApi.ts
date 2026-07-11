import api from "./axios";
import type { Patient, PatientFilters, PatientPayload, PatientStats } from "../types/patient";

export interface BirthdayExamRecord {
  id: number;
  nombre: string;
  fecha_cumpleanos: string;
  telefono: string;
}

export type BirthdayExamPayload = Omit<BirthdayExamRecord, "id">;

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

export async function getBirthdayExamRecords() {
  const { data } = await api.get<BirthdayExamRecord[]>("/patients/birthday-exam/");
  return data;
}

export async function getBirthdayExamRecord(id: number | string) {
  const { data } = await api.get<BirthdayExamRecord>(`/patients/birthday-exam/${id}/`);
  return data;
}

export async function createBirthdayExamRecord(payload: BirthdayExamPayload) {
  const { data } = await api.post<BirthdayExamRecord>("/patients/birthday-exam/", payload);
  return data;
}

export async function updateBirthdayExamRecord(id: number | string, payload: Partial<BirthdayExamPayload>) {
  const { data } = await api.patch<BirthdayExamRecord>(`/patients/birthday-exam/${id}/`, payload);
  return data;
}

export async function deleteBirthdayExamRecord(id: number | string) {
  await api.delete(`/patients/birthday-exam/${id}/`);
}
