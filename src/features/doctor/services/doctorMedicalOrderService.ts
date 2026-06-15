import { endpoints } from '@/core/api/endpoints';
import { postFirstAvailable } from '@/features/doctor/services/doctorApiHelpers';
import type { CreateMedicalOrderPayload } from '@/features/doctor/types/doctorMedicalOrder.types';

export async function createDoctorMedicalOrder(
  payload: CreateMedicalOrderPayload,
  consultationId?: number | string,
) {
  const urls = consultationId
    ? [endpoints.doctor.consultationMedicalOrders(consultationId), endpoints.doctor.medicalOrders]
    : [endpoints.doctor.medicalOrders];
  return postFirstAvailable(urls, payload);
}
