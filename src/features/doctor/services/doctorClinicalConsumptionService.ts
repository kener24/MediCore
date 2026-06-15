import { endpoints } from '@/core/api/endpoints';
import { postFirstAvailable } from '@/features/doctor/services/doctorApiHelpers';
import type { ClinicalConsumptionPayload } from '@/features/doctor/types/doctorClinicalConsumption.types';

export async function createDoctorClinicalConsumption(
  payload: ClinicalConsumptionPayload,
  consultationId?: number | string,
) {
  const urls = consultationId
    ? [endpoints.doctor.consultationConsumptions(consultationId), endpoints.doctor.clinicalConsumptions]
    : [endpoints.doctor.clinicalConsumptions];
  return postFirstAvailable(urls, payload);
}
