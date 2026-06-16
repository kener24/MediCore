import { endpoints } from '@/core/api/endpoints';
import { getFirstAvailable, postFirstAvailable } from '@/features/doctor/services/doctorApiHelpers';
import { normalizeListResponse, type ApiListResponse } from '@/features/doctor/types/commonDoctor.types';
import type {
  ClinicalConsumptionPayload,
  DoctorClinicalConsumption,
  InventoryItem,
} from '@/features/doctor/types/doctorClinicalConsumption.types';

export async function getAvailableInventoryItems(search?: string) {
  const data = await getFirstAvailable<ApiListResponse<InventoryItem>>(
    [endpoints.doctor.inventoryItems],
    { params: { available: 'true', search } },
  );
  return normalizeListResponse(data);
}

export async function getConsultationConsumptions(consultationId: number | string) {
  const data = await getFirstAvailable<ApiListResponse<DoctorClinicalConsumption>>(
    [endpoints.doctor.consultationConsumptions(consultationId), endpoints.doctor.clinicalConsumptions],
    { params: { consultation: consultationId } },
  );
  return normalizeListResponse(data);
}

export async function createClinicalConsumption(consultationId: number | string, payload: ClinicalConsumptionPayload) {
  return postFirstAvailable<DoctorClinicalConsumption>(
    [endpoints.doctor.consultationConsumptions(consultationId), endpoints.doctor.clinicalConsumptions],
    { ...payload, consultation: Number(consultationId) },
  );
}

export const createDoctorClinicalConsumption = (payload: ClinicalConsumptionPayload, consultationId?: number | string) =>
  consultationId
    ? createClinicalConsumption(consultationId, payload)
    : postFirstAvailable<DoctorClinicalConsumption>([endpoints.doctor.clinicalConsumptions], payload);
