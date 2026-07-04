import type { ConsultationFormValues, DoctorConsultation } from '@/features/doctor/types/doctorConsultation.types';

const requiredForSave: (keyof ConsultationFormValues)[] = ['chief_complaint', 'diagnosis_text'];
const requiredForFinish: (keyof ConsultationFormValues)[] = [
  'chief_complaint',
  'history_present_illness',
  'physical_examination',
  'diagnosis_text',
  'plan',
  'recommendations',
];

const labels: Record<keyof ConsultationFormValues, string> = {
  assessment: 'evaluación clínica',
  chief_complaint: 'motivo principal',
  diagnosis_text: 'diagnóstico',
  history_present_illness: 'historia de enfermedad actual',
  notes: 'notas adicionales',
  physical_examination: 'examen físico',
  plan: 'plan de tratamiento',
  recommendations: 'recomendaciones',
};

export function validateConsultationDraft(form: ConsultationFormValues) {
  return Object.values(form).some((value) => value.trim().length > 0) ? '' : 'No hay información para guardar.';
}

export function validateConsultationSave(form: ConsultationFormValues) {
  for (const field of requiredForSave) {
    if (form[field].trim().length < 3) return `Completa ${labels[field]}.`;
  }
  if (form.assessment.trim().length < 3 && form.diagnosis_text.trim().length < 3) {
    return 'Agrega un diagnóstico o evaluación clínica.';
  }
  return '';
}

export function validateConsultationFinish(form: ConsultationFormValues, consultation?: DoctorConsultation | null) {
  const source = consultation ? toFormValuesFromConsultation(consultation, form) : form;
  for (const field of requiredForFinish) {
    if (source[field].trim().length < 3) return `Antes de finalizar completa ${labels[field]}.`;
  }
  return '';
}

export function consultationProgress(form: ConsultationFormValues) {
  const completed = requiredForFinish.filter((field) => form[field].trim().length >= 3).length;
  return {
    completed,
    percent: Math.round((completed / requiredForFinish.length) * 100),
    required: requiredForFinish.length,
  };
}

function toFormValuesFromConsultation(
  consultation: DoctorConsultation,
  fallback: ConsultationFormValues,
): ConsultationFormValues {
  return {
    assessment: consultation.assessment ?? consultation.clinical_assessment ?? fallback.assessment,
    chief_complaint: consultation.chief_complaint ?? fallback.chief_complaint,
    diagnosis_text: consultation.diagnosis_text ?? consultation.preliminary_diagnosis ?? fallback.diagnosis_text,
    history_present_illness: consultation.history_present_illness ?? consultation.symptoms ?? fallback.history_present_illness,
    notes: consultation.notes ?? consultation.private_notes ?? fallback.notes,
    physical_examination: consultation.physical_examination ?? consultation.physical_exam ?? fallback.physical_examination,
    plan: consultation.plan ?? consultation.treatment_plan ?? fallback.plan,
    recommendations: consultation.recommendations ?? fallback.recommendations,
  };
}
