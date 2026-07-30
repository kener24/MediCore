import { apiClient } from '@/core/api/apiClient';
import { endpoints } from '@/core/api/endpoints';
import type { PatientMedicalRecordSummary } from '@/features/patient/types/patientMedicalRecord.types';

export async function getPatientMedicalRecordSummary() {
  const { data } = await apiClient.get<PatientMedicalRecordSummary>(
    endpoints.patientPortal.medicalRecordSummary,
  );
  return data;
}

export type PatientDischargeSummary = {
  id: number;
  version: number;
  discharge_type: string;
  hospital_course: string;
  discharge_diagnoses: string;
  condition_at_discharge: string;
  treatment_at_discharge?: string;
  recommendations: string;
  warning_signs?: string;
  follow_up_plan: string;
  pending_results?: string;
  signed_at?: string;
};

export async function getPatientDischargeSummaries() {
  const { data } = await apiClient.get<PatientDischargeSummary[]>('/patient-portal/discharge-summaries/');
  return data;
}
