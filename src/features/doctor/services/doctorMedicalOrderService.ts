import { endpoints } from '@/core/api/endpoints';
import { getFirstAvailable, postFirstAvailable } from '@/features/doctor/services/doctorApiHelpers';
import { normalizeListResponse, type ApiListResponse } from '@/features/doctor/types/commonDoctor.types';
import type { CreateMedicalOrderPayload, DoctorMedicalOrder } from '@/features/doctor/types/doctorMedicalOrder.types';

export async function getConsultationMedicalOrders(consultationId: number | string) {
  const data = await getFirstAvailable<ApiListResponse<DoctorMedicalOrder>>(
    [endpoints.doctor.consultationMedicalOrders(consultationId), endpoints.doctor.medicalOrders],
    { params: { consultation: consultationId } },
  );
  return normalizeListResponse(data);
}

export async function createMedicalOrder(consultationId: number | string, payload: CreateMedicalOrderPayload) {
  return postFirstAvailable<DoctorMedicalOrder>(
    [endpoints.doctor.consultationMedicalOrders(consultationId), endpoints.doctor.medicalOrders],
    { ...payload, consultation: Number(consultationId) },
  );
}

export async function getMedicalOrderDetail(id: number | string) {
  return getFirstAvailable<DoctorMedicalOrder>([`${endpoints.doctor.medicalOrders}${id}/`]);
}

export const createDoctorMedicalOrder = (payload: CreateMedicalOrderPayload, consultationId?: number | string) =>
  consultationId ? createMedicalOrder(consultationId, payload) : postFirstAvailable<DoctorMedicalOrder>([endpoints.doctor.medicalOrders], payload);
