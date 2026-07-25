import { endpoints } from '@/core/api/endpoints';
import { getFirstAvailable, patchFirstAvailable, postFirstAvailable } from '@/features/doctor/services/doctorApiHelpers';
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

export const startMedicalOrder = (id: number | string) => patchFirstAvailable<DoctorMedicalOrder>([`${endpoints.doctor.medicalOrders}${id}/start/`]);
export const completeMedicalOrder = (id: number | string, resultSummary: string) => patchFirstAvailable<DoctorMedicalOrder>([`${endpoints.doctor.medicalOrders}${id}/complete/`], { result_summary: resultSummary });
export const reviewMedicalOrder = (id: number | string, notes = '') => patchFirstAvailable<DoctorMedicalOrder>([`${endpoints.doctor.medicalOrders}${id}/review/`], { notes });
export const cancelMedicalOrder = (id: number | string, reason: string) => patchFirstAvailable<DoctorMedicalOrder>([`${endpoints.doctor.medicalOrders}${id}/cancel/`], { reason });

export const createDoctorMedicalOrder = (payload: CreateMedicalOrderPayload, consultationId?: number | string) =>
  consultationId ? createMedicalOrder(consultationId, payload) : postFirstAvailable<DoctorMedicalOrder>([endpoints.doctor.medicalOrders], payload);
