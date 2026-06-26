export type PatientMedicalRecordConsultation = {
  id: number;
  consultation_date?: string;
  chief_complaint?: string;
  clinical_assessment?: string;
  preliminary_diagnosis?: string;
  treatment_plan?: string;
  recommendations?: string;
};

export type PatientMedicalRecordDiagnosis = {
  id: number;
  code?: string;
  name?: string;
  diagnosis_type?: string;
  is_primary?: boolean;
};

export type PatientMedicalRecordLinkedItem = {
  id: number;
  prescription_number?: string;
  order_number?: string;
  issue_date?: string;
  order_type?: string;
  title?: string;
  status?: string;
  priority?: string;
  general_instructions?: string;
};

export type PatientMedicalRecordSummary = {
  record_number?: string;
  blood_type?: string;
  allergies?: string;
  chronic_diseases?: string;
  surgical_history?: string;
  family_history?: string;
  current_medications?: string;
  consultations?: PatientMedicalRecordConsultation[];
  diagnoses?: PatientMedicalRecordDiagnosis[];
  prescriptions?: PatientMedicalRecordLinkedItem[];
  medical_orders?: PatientMedicalRecordLinkedItem[];
};
