import { apiClient } from '@/core/api/apiClient';
import { endpoints } from '@/core/api/endpoints';
import type { PatientPortalSettings } from '@/features/patient/types/patientPortalSettings.types';

export async function getPatientPortalSettings() {
  const { data } = await apiClient.get<PatientPortalSettings>(endpoints.patientPortal.settings);
  return data;
}
