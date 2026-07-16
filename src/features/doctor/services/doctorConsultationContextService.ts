import { toPositiveId } from '@/core/utils/idUtils';
import { getConsultationByVisit, getConsultationDetail } from '@/features/doctor/services/doctorConsultationService';

export type DoctorConsultationRouteParams = {
  consultationId?: number | string;
  patientId?: number | string;
  visitId?: number | string;
};

export async function resolveRequiredConsultation(params: DoctorConsultationRouteParams) {
  const consultationParamId = toPositiveId(params.consultationId);
  const patientParamId = toPositiveId(params.patientId);
  const visitParamId = toPositiveId(params.visitId);

  if (consultationParamId) {
    const consultation = await getConsultationDetail(consultationParamId);
    return {
      consultation,
      consultationId: toPositiveId(consultation.id ?? consultation.consultation_id) ?? consultationParamId,
      patientId: patientParamId ?? toPositiveId(consultation.patient_id ?? (typeof consultation.patient === 'number' ? consultation.patient : undefined)),
      visitId: visitParamId ?? toPositiveId(consultation.visit_id ?? consultation.patient_visit),
    };
  }
  if (visitParamId) {
    const consultation = await getConsultationByVisit(visitParamId);
    if (consultation) {
      return {
        consultation,
        consultationId: toPositiveId(consultation.id ?? consultation.consultation_id),
        patientId: patientParamId ?? toPositiveId(consultation.patient_id ?? (typeof consultation.patient === 'number' ? consultation.patient : undefined)),
        visitId: visitParamId,
      };
    }
  }
  throw new Error('Primero debes guardar la consulta médica para continuar.');
}
