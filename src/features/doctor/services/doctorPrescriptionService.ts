import { endpoints } from '@/core/api/endpoints';
import { getFirstAvailable, postFirstAvailable } from '@/features/doctor/services/doctorApiHelpers';
import { normalizeListResponse, type ApiListResponse } from '@/features/doctor/types/commonDoctor.types';
import type { CreatePrescriptionPayload, DoctorPrescription } from '@/features/doctor/types/doctorPrescription.types';

export async function getConsultationPrescriptions(consultationId: number | string) {
  const data = await getFirstAvailable<ApiListResponse<DoctorPrescription>>(
    [endpoints.doctor.consultationPrescriptions(consultationId), endpoints.doctor.prescriptions],
    { params: { consultation: consultationId } },
  );
  return normalizeListResponse(data);
}

export async function createPrescription(consultationId: number | string, payload: CreatePrescriptionPayload) {
  return postFirstAvailable<DoctorPrescription>(
    [endpoints.doctor.consultationPrescriptions(consultationId), endpoints.doctor.prescriptions],
    { ...payload, consultation: Number(consultationId) },
  );
}

export async function getPrescriptionDetail(id: number | string) {
  return getFirstAvailable<DoctorPrescription>([`${endpoints.doctor.prescriptions}${id}/`]);
}

export const createDoctorPrescription = (payload: CreatePrescriptionPayload, consultationId?: number | string) =>
  consultationId ? createPrescription(consultationId, payload) : postFirstAvailable<DoctorPrescription>([endpoints.doctor.prescriptions], payload);
