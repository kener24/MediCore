import { apiClient } from '@/core/api/apiClient';
import { endpoints } from '@/core/api/endpoints';
import type {
  PatientProfile,
  PatientProfileUpdatePayload,
} from '@/features/patient/types/patientProfile.types';

export async function getPatientProfile() {
  const { data } = await apiClient.get<PatientProfile>(endpoints.patientPortal.profile);
  return data;
}

export async function updatePatientProfile(payload: Partial<PatientProfileUpdatePayload>) {
  const { data } = await apiClient.patch<PatientProfile>(endpoints.patientPortal.profile, payload);
  return data;
}
