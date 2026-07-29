export type DoctorHospitalization = {
  id: number;
  patient: number;
  patient_name: string;
  patient_code?: string;
  patient_identity?: string;
  patient_birth_date?: string | null;
  patient_allergies?: string;
  patient_chronic_diseases?: string;
  current_bed_code?: string;
  current_room?: string;
  responsible_doctor_name?: string;
  status: string;
  reason: string;
  diagnosis_at_admission?: string;
  admission_datetime: string;
};

export type MedicalEvolution = {
  id: number;
  status: 'draft' | 'signed' | 'correction';
  doctor_name?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  progress_notes?: string;
  signed_at?: string | null;
  creado_en: string;
};

export type TreatmentPlan = {
  id: number;
  version: number;
  status: string;
  goals?: string;
  treatment?: string;
  monitoring?: string;
  precautions?: string;
  change_reason?: string;
  doctor_name?: string;
  creado_en: string;
};

export type MedicalInstruction = {
  id: number;
  title: string;
  details: string;
  instruction_type: string;
  priority: string;
  status: string;
  acknowledged_by_name?: string;
  acknowledged_at?: string | null;
  completed_at?: string | null;
  creado_en: string;
};

export type TimelineEntry = {
  id: string;
  title: string;
  description: string;
  severity: string;
  occurred_at: string;
  user?: string;
};
