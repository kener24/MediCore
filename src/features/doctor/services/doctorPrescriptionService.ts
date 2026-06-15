import { endpoints } from '@/core/api/endpoints';
import { postFirstAvailable } from '@/features/doctor/services/doctorApiHelpers';
import type { CreatePrescriptionPayload } from '@/features/doctor/types/doctorPrescription.types';

export async function createDoctorPrescription(
  payload: CreatePrescriptionPayload,
  consultationId?: number | string,
) {
  const urls = consultationId
    ? [endpoints.doctor.consultationPrescriptions(consultationId), endpoints.doctor.prescriptions]
    : [endpoints.doctor.prescriptions];
  return postFirstAvailable(urls, payload);
}
