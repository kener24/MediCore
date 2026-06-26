import { apiClient } from '@/core/api/apiClient';
import { endpoints } from '@/core/api/endpoints';
import { normalizeList, type ListResponse } from '@/features/patient/types/pagination.types';
import type { PatientMedicalOrder } from '@/features/patient/types/patientMedicalOrders.types';

export async function getPatientMedicalOrders(params?: Record<string, string>) {
  const { data } = await apiClient.get<ListResponse<PatientMedicalOrder>>(
    endpoints.patientPortal.medicalOrders,
    { params },
  );
  return normalizeList(data);
}

export async function getPatientMedicalOrder(id: number | string) {
  const { data } = await apiClient.get<PatientMedicalOrder>(endpoints.patientPortal.medicalOrder(id));
  return data;
}
