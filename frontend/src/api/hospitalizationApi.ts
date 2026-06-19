import api from "./axios";
import type {
  HospitalBed,
  HospitalRoom,
  HospitalVitalSigns,
  Hospitalization,
  HospitalizationCreatePayload,
  HospitalizationDashboard,
  MedicationAdministration,
  NursingNote,
  NursingRound,
} from "../types/hospitalization";

type PaginatedResponse<T> = T[] | { results?: T[] };

function normalizeList<T>(data: PaginatedResponse<T>): T[] {
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function getHospitalizationDashboard() {
  const { data } = await api.get<HospitalizationDashboard>("/hospitalization/dashboard/");
  return data;
}

export async function getHospitalizations(filters?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<Hospitalization>>("/hospitalization/admissions/", { params: filters });
  return normalizeList(data);
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
  const { data } = await api.get<PaginatedResponse<HospitalRoom>>("/hospitalization/rooms/");
  return normalizeList(data);
}

export async function createHospitalRoom(payload: Partial<HospitalRoom>) {
  const { data } = await api.post<HospitalRoom>("/hospitalization/rooms/", payload);
  return data;
}

export async function getHospitalBeds(filters?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<HospitalBed>>("/hospitalization/beds/", { params: filters });
  return normalizeList(data);
}

export async function createHospitalBed(payload: Partial<HospitalBed>) {
  const { data } = await api.post<HospitalBed>("/hospitalization/beds/", payload);
  return data;
}

export async function getAvailableHospitalBeds() {
  const { data } = await api.get<PaginatedResponse<HospitalBed>>("/hospitalization/beds/available/");
  return normalizeList(data);
}

export async function createHospitalVitalSigns(id: number | string, payload: Partial<HospitalVitalSigns>) {
  const { data } = await api.post<HospitalVitalSigns>(`/hospitalization/admissions/${id}/vital-signs/`, payload);
  return data;
}

export async function createNursingNote(id: number | string, payload: Partial<NursingNote>) {
  const { data } = await api.post<NursingNote>(`/hospitalization/admissions/${id}/nursing-notes/`, payload);
  return data;
}

export async function getNursingRounds(id: number | string) {
  const { data } = await api.get<PaginatedResponse<NursingRound>>(`/hospitalization/admissions/${id}/nursing-rounds/`);
  return normalizeList(data);
}

export async function createNursingRound(id: number | string, payload: Partial<NursingRound>) {
  const { data } = await api.post<NursingRound>(`/hospitalization/admissions/${id}/nursing-rounds/`, payload);
  return data;
}

export async function getMedicationAdministrations(id: number | string) {
  const { data } = await api.get<PaginatedResponse<MedicationAdministration>>(`/hospitalization/admissions/${id}/medication-administrations/`);
  return normalizeList(data);
}

export async function createMedicationAdministration(id: number | string, payload: Partial<MedicationAdministration>) {
  const { data } = await api.post<MedicationAdministration>(`/hospitalization/admissions/${id}/medication-administrations/`, payload);
  return data;
}

export async function administerMedication(id: number | string, payload: { notes?: string }) {
  const { data } = await api.post<MedicationAdministration>(`/hospitalization/medication-administrations/${id}/administer/`, payload);
  return data;
}

export async function omitMedication(id: number | string, payload: { reason: string; notes?: string }) {
  const { data } = await api.post<MedicationAdministration>(`/hospitalization/medication-administrations/${id}/omit/`, payload);
  return data;
}

export async function delayMedication(id: number | string, payload: { notes?: string }) {
  const { data } = await api.post<MedicationAdministration>(`/hospitalization/medication-administrations/${id}/delay/`, payload);
  return data;
}

export async function getPendingMedications() {
  const { data } = await api.get<PaginatedResponse<MedicationAdministration>>("/hospitalization/medications/pending/");
  return normalizeList(data);
}
