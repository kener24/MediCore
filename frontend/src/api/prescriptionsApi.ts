import api from "./axios";
import type { Diagnosis, DiagnosisFilters, DiagnosisPayload, MedicalOrder, MedicalOrderFilters, MedicalOrderPayload, Prescription, PrescriptionFilters, PrescriptionItem, PrescriptionItemPayload, PrescriptionPayload, PrescriptionStats } from "../types/prescription";

export async function getDiagnoses(filters?: DiagnosisFilters) {
  const { data } = await api.get<Diagnosis[]>("/diagnoses/", { params: filters });
  return data;
}
export async function getDiagnosis(id: number | string) {
  const { data } = await api.get<Diagnosis>(`/diagnoses/${id}/`);
  return data;
}
export async function createDiagnosis(payload: DiagnosisPayload) {
  const { data } = await api.post<Diagnosis>("/diagnoses/", payload);
  return data;
}
export async function updateDiagnosis(id: number | string, payload: DiagnosisPayload) {
  const { data } = await api.patch<Diagnosis>(`/diagnoses/${id}/`, payload);
  return data;
}
export async function deleteDiagnosis(id: number | string) {
  await api.delete(`/diagnoses/${id}/`);
}
export async function getConsultationDiagnoses(consultationId: number | string) {
  const { data } = await api.get<Diagnosis[]>(`/consultations/${consultationId}/diagnoses/`);
  return data;
}
export async function createConsultationDiagnosis(consultationId: number | string, payload: DiagnosisPayload) {
  const { data } = await api.post<Diagnosis>(`/consultations/${consultationId}/diagnoses/`, payload);
  return data;
}
export async function getMyDiagnoses() {
  const { data } = await api.get<Diagnosis[]>("/diagnoses/my-diagnoses/");
  return data;
}

export async function getPrescriptions(filters?: PrescriptionFilters) {
  const { data } = await api.get<Prescription[]>("/prescriptions/", { params: filters });
  return data;
}
export async function getPrescription(id: number | string) {
  const { data } = await api.get<Prescription>(`/prescriptions/${id}/`);
  return data;
}
export async function createPrescription(payload: PrescriptionPayload) {
  const { data } = await api.post<Prescription>("/prescriptions/", payload);
  return data;
}
export async function issuePrescription(id: number | string) {
  const { data } = await api.patch<Prescription>(`/prescriptions/${id}/issue/`);
  return data;
}
export async function voidPrescription(id: number | string, reason: string) {
  const { data } = await api.patch<Prescription>(`/prescriptions/${id}/void/`, { reason });
  return data;
}
export async function getConsultationPrescriptions(consultationId: number | string) {
  const { data } = await api.get<Prescription[]>(`/consultations/${consultationId}/prescriptions/`);
  return data;
}
export async function createConsultationPrescription(consultationId: number | string, payload: PrescriptionPayload) {
  const { data } = await api.post<Prescription>(`/consultations/${consultationId}/prescriptions/`, payload);
  return data;
}
export async function getPrescriptionItems(prescriptionId: number | string) {
  const { data } = await api.get<PrescriptionItem[]>(`/prescriptions/${prescriptionId}/items/`);
  return data;
}
export async function createPrescriptionItem(prescriptionId: number | string, payload: PrescriptionItemPayload) {
  const { data } = await api.post<PrescriptionItem>(`/prescriptions/${prescriptionId}/items/`, payload);
  return data;
}
export async function getMyPrescriptions() {
  const { data } = await api.get<Prescription[]>("/prescriptions/my-prescriptions/");
  return data;
}

export async function getMedicalOrders(filters?: MedicalOrderFilters) {
  const { data } = await api.get<MedicalOrder[]>("/medical-orders/", { params: filters });
  return data;
}
export async function getConsultationMedicalOrders(consultationId: number | string) {
  const { data } = await api.get<MedicalOrder[]>(`/consultations/${consultationId}/medical-orders/`);
  return data;
}
export async function createConsultationMedicalOrder(consultationId: number | string, payload: MedicalOrderPayload) {
  const { data } = await api.post<MedicalOrder>(`/consultations/${consultationId}/medical-orders/`, payload);
  return data;
}
export async function completeMedicalOrder(id: number | string) {
  const { data } = await api.patch<MedicalOrder>(`/medical-orders/${id}/complete/`);
  return data;
}
export async function cancelMedicalOrder(id: number | string) {
  const { data } = await api.patch<MedicalOrder>(`/medical-orders/${id}/cancel/`);
  return data;
}
export async function getMyMedicalOrders() {
  const { data } = await api.get<MedicalOrder[]>("/medical-orders/my-orders/");
  return data;
}
export async function getPrescriptionStats(filters?: PrescriptionFilters) {
  const { data } = await api.get<PrescriptionStats>("/prescriptions/stats/", { params: filters });
  return data;
}
