import { apiClient } from '@/core/api/apiClient';
import { endpoints } from '@/core/api/endpoints';
import type { PatientDashboardResponse } from '@/features/patient/types/patientDashboard.types';
import { normalizePatientDashboard } from '@/features/patient/utils/dashboardMapper';

export async function getPatientDashboard() {
  const { data } = await apiClient.get<PatientDashboardResponse>(endpoints.patientPortal.dashboard);
  return normalizePatientDashboard(data);
}
