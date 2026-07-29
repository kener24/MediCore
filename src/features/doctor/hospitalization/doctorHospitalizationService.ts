import { apiClient } from '@/core/api/apiClient';
import type { DoctorHospitalization, MedicalEvolution, MedicalInstruction, TimelineEntry, TreatmentPlan } from '@/features/doctor/hospitalization/doctorHospitalization.types';

function list<T>(data: T[] | { results?: T[] }) {
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function getDoctorHospitalizations() {
  const { data } = await apiClient.get<DoctorHospitalization[] | { results?: DoctorHospitalization[] }>('/hospitalization/admissions/', { params: { active: true } });
  return list(data);
}

export async function getDoctorHospitalization(id: number) {
  const { data } = await apiClient.get<DoctorHospitalization>(`/hospitalization/admissions/${id}/`);
  return data;
}

export async function getMedicalEvolutions(id: number) {
  const { data } = await apiClient.get<MedicalEvolution[] | { results?: MedicalEvolution[] }>(`/hospitalization/admissions/${id}/evolutions/`);
  return list(data);
}

export async function createMedicalEvolution(id: number, payload: Pick<MedicalEvolution, 'subjective' | 'objective' | 'assessment' | 'plan'>) {
  const { data } = await apiClient.post<MedicalEvolution>(`/hospitalization/admissions/${id}/evolutions/`, payload);
  return data;
}

export async function signMedicalEvolution(id: number) {
  const { data } = await apiClient.post<MedicalEvolution>(`/hospitalization/evolutions/${id}/sign/`, {});
  return data;
}

export async function getTreatmentPlans(id: number) {
  const { data } = await apiClient.get<TreatmentPlan[] | { results?: TreatmentPlan[] }>(`/hospitalization/admissions/${id}/treatment-plans/`);
  return list(data);
}

export async function createTreatmentPlan(id: number, payload: Partial<TreatmentPlan>) {
  const { data } = await apiClient.post<TreatmentPlan>(`/hospitalization/admissions/${id}/treatment-plans/`, payload);
  return data;
}

export async function getMedicalInstructions(id: number) {
  const { data } = await apiClient.get<MedicalInstruction[] | { results?: MedicalInstruction[] }>(`/hospitalization/admissions/${id}/instructions/`);
  return list(data);
}

export async function createMedicalInstruction(id: number, payload: Partial<MedicalInstruction>) {
  const { data } = await apiClient.post<MedicalInstruction>(`/hospitalization/admissions/${id}/instructions/`, payload);
  return data;
}

export async function getHospitalTimeline(id: number) {
  const { data } = await apiClient.get<{ results?: TimelineEntry[] }>(`/hospitalization/admissions/${id}/timeline/`);
  return data.results ?? [];
}
