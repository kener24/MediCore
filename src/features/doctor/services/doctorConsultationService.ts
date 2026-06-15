import { apiClient } from '@/core/api/apiClient';
import { endpoints } from '@/core/api/endpoints';
import { getFirstAvailable, patchFirstAvailable, postFirstAvailable } from '@/features/doctor/services/doctorApiHelpers';
import { normalizeListResponse, type ApiListResponse } from '@/features/doctor/types/commonDoctor.types';
import type {
  ConsultationPayload,
  DoctorConsultation,
  DoctorPatientSummary,
  DoctorVitalSigns,
} from '@/features/doctor/types/doctorConsultation.types';

export async function getVisitDetail(visitId: number | string) {
  return getFirstAvailable<Record<string, unknown>>([endpoints.doctor.visit(visitId)]);
}

export async function getDoctorPatientSummary(patientId: number | string) {
  return getFirstAvailable<DoctorPatientSummary>([
    endpoints.doctor.patientSummary(patientId),
    endpoints.doctor.patientSummaryAlt(patientId),
  ]);
}

export async function getVisitVitalSigns(visitId: number | string) {
  const data = await getFirstAvailable<ApiListResponse<DoctorVitalSigns> | DoctorVitalSigns>(
    [endpoints.doctor.vitalSigns(visitId), endpoints.doctor.vitalSignsAlt],
    { params: { visit: visitId } },
  );
  const list = normalizeListResponse(data as ApiListResponse<DoctorVitalSigns>);
  return list[0] ?? (data as DoctorVitalSigns);
}

export async function startConsultation(visitId: number | string) {
  return postFirstAvailable<DoctorConsultation>([endpoints.doctor.startConsultation(visitId)]);
}

export async function completeConsultation(visitId: number | string, payload?: ConsultationPayload) {
  return postFirstAvailable<DoctorConsultation>([endpoints.doctor.completeConsultation(visitId)], payload);
}

export async function createConsultation(payload: ConsultationPayload & { visit?: number | string }) {
  const { data } = await apiClient.post<DoctorConsultation>(endpoints.doctor.consultations, payload);
  return data;
}

export async function updateConsultation(id: number | string, payload: ConsultationPayload) {
  return patchFirstAvailable<DoctorConsultation>([endpoints.doctor.consultation(id)], payload);
}

export async function getConsultation(id: number | string) {
  return getFirstAvailable<DoctorConsultation>([endpoints.doctor.consultation(id)]);
}
