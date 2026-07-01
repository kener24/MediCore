import { endpoints } from '@/core/api/endpoints';
import { startConsultation as startVisitConsultation } from '@/features/doctor/services/doctorConsultationService';
import { getFirstAvailable } from '@/features/doctor/services/doctorApiHelpers';
import { normalizeListResponse, type ApiListResponse } from '@/features/doctor/types/commonDoctor.types';
import type {
  DoctorPatientBasicInfo,
  DoctorPatientMedicalSummary,
  DoctorTriageInfo,
  DoctorVisitDetail,
  DoctorVitalSigns,
} from '@/features/doctor/types/doctorPatient.types';

export async function getVisitDetail(visitId: number | string) {
  return getFirstAvailable<DoctorVisitDetail>([
    endpoints.doctor.visit(visitId),
    endpoints.doctor.visitAlt(visitId),
  ]);
}

export async function getPatientSummary(patientId: number | string) {
  return getFirstAvailable<DoctorPatientBasicInfo>([
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

export async function getVisitTriage(visitId: number | string) {
  return getFirstAvailable<DoctorTriageInfo>([endpoints.doctor.triage(visitId)]);
}

export async function getPatientMedicalSummary(patientId: number | string) {
  return getFirstAvailable<DoctorPatientMedicalSummary>([
    endpoints.doctor.patientSummaryAlt(patientId),
    endpoints.doctor.patientSummary(patientId),
  ]);
}

export async function startConsultation(visitId: number | string) {
  return startVisitConsultation(visitId);
}
