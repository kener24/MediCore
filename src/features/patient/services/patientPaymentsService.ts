import { apiClient } from '@/core/api/apiClient';
import { endpoints } from '@/core/api/endpoints';
import { normalizeList, type ListResponse } from '@/features/patient/types/pagination.types';
import type { PatientPayment } from '@/features/patient/types/patientPayments.types';

export async function getPatientPayments(params?: Record<string, string>) {
  const { data } = await apiClient.get<ListResponse<PatientPayment>>(
    endpoints.patientPortal.payments,
    { params },
  );
  return normalizeList(data);
}

export async function getPatientPayment(id: number | string) {
  const { data } = await apiClient.get<PatientPayment>(endpoints.patientPortal.payment(id));
  return data;
}
