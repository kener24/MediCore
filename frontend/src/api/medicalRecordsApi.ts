import api from "./axios";
import type { ClinicalConsultation, ClinicalHistory, ClinicalSupplyUsage, ConsultationFilters, ConsultationPayload, MedicalRecord, MedicalRecordFilters, MedicalRecordPayload, MedicalRecordStats, VitalSigns, VitalSignsPayload } from "../types/medicalRecord";

export async function getMedicalRecords(filters?: MedicalRecordFilters) {
  const { data } = await api.get<MedicalRecord[]>("/medical-records/", { params: filters });
  return data;
}

export async function getMedicalRecord(id: number | string) {
  const { data } = await api.get<MedicalRecord>(`/medical-records/${id}/`);
  return data;
}

export async function createMedicalRecord(payload: MedicalRecordPayload) {
  const { data } = await api.post<MedicalRecord>("/medical-records/", payload);
  return data;
}

export async function updateMedicalRecord(id: number | string, payload: MedicalRecordPayload) {
  const { data } = await api.patch<MedicalRecord>(`/medical-records/${id}/`, payload);
  return data;
}

export async function getPatientMedicalRecord(patientId: number | string) {
  const { data } = await api.get<MedicalRecord>(`/patients/${patientId}/medical-record/`);
  return data;
}

export async function getMyMedicalRecord() {
  const { data } = await api.get<MedicalRecord>("/medical-records/me/");
  return data;
}

export async function getMedicalRecordStats(filters?: MedicalRecordFilters) {
  const { data } = await api.get<MedicalRecordStats>("/medical-records/stats/", { params: filters });
  return data;
}

export async function getConsultations(filters?: ConsultationFilters) {
  const { data } = await api.get<ClinicalConsultation[]>("/consultations/", { params: filters });
  return data;
}

export async function getConsultation(id: number | string) {
  const { data } = await api.get<ClinicalConsultation>(`/consultations/${id}/`);
  return data;
}

export async function createConsultation(payload: ConsultationPayload) {
  const { data } = await api.post<ClinicalConsultation>("/consultations/", payload);
  return data;
}

export async function updateConsultation(id: number | string, payload: ConsultationPayload) {
  const { data } = await api.patch<ClinicalConsultation>(`/consultations/${id}/`, payload);
  return data;
}

export async function finalizeConsultation(id: number | string, payload: ConsultationPayload = {}) {
  const { data } = await api.patch<ClinicalConsultation>(`/consultations/${id}/finalize/`, payload);
  return data;
}

export async function voidConsultation(id: number | string, reason: string) {
  const { data } = await api.patch<ClinicalConsultation>(`/consultations/${id}/void/`, { reason });
  return data;
}

export async function startConsultationFromAppointment(appointmentId: number | string) {
  const { data } = await api.post<ClinicalConsultation>(`/appointments/${appointmentId}/start-consultation/`);
  return data;
}

export async function getMyConsultations(filters?: ConsultationFilters) {
  const { data } = await api.get<ClinicalConsultation[]>("/consultations/my-consultations/", { params: filters });
  return data;
}

export async function getPatientClinicalHistory(patientId: number | string) {
  const { data } = await api.get<ClinicalHistory>(`/patients/${patientId}/clinical-history/`);
  return data;
}

export async function getVitalSigns(consultationId: number | string) {
  const { data } = await api.get<VitalSigns>(`/consultations/${consultationId}/vital-signs/`);
  return data;
}

export async function createVitalSigns(consultationId: number | string, payload: VitalSignsPayload) {
  const { data } = await api.post<VitalSigns>(`/consultations/${consultationId}/vital-signs/`, payload);
  return data;
}

export async function updateVitalSigns(consultationId: number | string, payload: VitalSignsPayload) {
  const { data } = await api.patch<VitalSigns>(`/consultations/${consultationId}/vital-signs/`, payload);
  return data;
}

export async function getClinicalConsumptions(filters?: Record<string, string>) {
  const { data } = await api.get<ClinicalSupplyUsage[]>("/clinical-consumptions/", { params: filters });
  return data;
}

export async function getConsultationConsumptions(consultationId: number | string) {
  const { data } = await api.get<ClinicalSupplyUsage[]>(`/consultations/${consultationId}/consumptions/`);
  return data;
}

export async function createConsultationConsumption(consultationId: number | string, payload: Partial<ClinicalSupplyUsage>) {
  const { data } = await api.post<ClinicalSupplyUsage>(`/consultations/${consultationId}/consumptions/`, payload);
  return data;
}

export async function cancelClinicalConsumption(id: number | string, reason: string) {
  const { data } = await api.patch<ClinicalSupplyUsage>(`/clinical-consumptions/${id}/cancel/`, { reason });
  return data;
}
