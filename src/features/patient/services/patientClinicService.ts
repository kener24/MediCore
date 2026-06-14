import { apiClient } from '@/core/api/apiClient';
import { endpoints } from '@/core/api/endpoints';
import type { PatientClinicInfo } from '@/features/patient/types/patientClinic.types';

export async function getClinicInfo() {
  const { data } = await apiClient.get<PatientClinicInfo>(endpoints.patientPortal.clinicInfo);
  return data;
}
