import { getConsultationByVisit, getConsultationDetail } from '@/features/doctor/services/doctorConsultationService';

export type DoctorConsultationRouteParams = {
  consultationId?: number;
  patientId?: number;
  visitId?: number;
};

export async function resolveRequiredConsultation(params: DoctorConsultationRouteParams) {
  if (params.consultationId) {
    const consultation = await getConsultationDetail(params.consultationId);
    return {
      consultation,
      consultationId: consultation.id ?? consultation.consultation_id ?? params.consultationId,
      patientId: params.patientId ?? consultation.patient_id ?? (typeof consultation.patient === 'number' ? consultation.patient : undefined),
      visitId: params.visitId ?? consultation.visit_id ?? consultation.patient_visit ?? undefined,
    };
  }
  if (params.visitId) {
    const consultation = await getConsultationByVisit(params.visitId);
    if (consultation) {
      return {
        consultation,
        consultationId: consultation.id ?? consultation.consultation_id,
        patientId: params.patientId ?? consultation.patient_id ?? (typeof consultation.patient === 'number' ? consultation.patient : undefined),
        visitId: params.visitId,
      };
    }
  }
  throw new Error('Primero debes guardar la consulta medica para continuar.');
}
