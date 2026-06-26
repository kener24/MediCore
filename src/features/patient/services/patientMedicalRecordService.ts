import { apiClient } from '@/core/api/apiClient';
import { endpoints } from '@/core/api/endpoints';
import type { PatientMedicalRecordSummary } from '@/features/patient/types/patientMedicalRecord.types';

export async function getPatientMedicalRecordSummary() {
  const { data } = await apiClient.get<PatientMedicalRecordSummary>(
    endpoints.patientPortal.medicalRecordSummary,
  );
  return data;
}
