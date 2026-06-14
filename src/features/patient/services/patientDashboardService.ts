import { apiClient } from '@/core/api/apiClient';
import { endpoints } from '@/core/api/endpoints';
import type { PatientDashboard } from '@/features/patient/types/patientDashboard.types';

export async function getPatientDashboard() {
  const { data } = await apiClient.get<PatientDashboard>(endpoints.patientPortal.dashboard);
  return data;
}
