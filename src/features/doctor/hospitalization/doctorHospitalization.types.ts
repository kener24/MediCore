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
  inventory_item?: number | null;
  dose?: string | null;
  dose_unit?: string;
  route?: string;
  interval_hours?: number | null;
  inventory_quantity?: string;
  as_needed?: boolean;
  effective_until?: string | null;
  allergy_warning?: string;
  allergy_override_reason?: string;
  version?: number;
};

export type MedicationAdministration = {
  id: number;
  medication_name: string;
  dosage: string;
  route?: string;
  scheduled_time?: string | null;
  administered_time?: string | null;
  status: string;
  administered_by_name?: string;
  omission_reason?: string;
  refusal_reason?: string;
  unavailable_reason?: string;
};

export type DischargeSummary = {
  id: number;
  version: number;
  status: 'draft' | 'signed' | 'replaced';
  discharge_type: string;
  hospital_course: string;
  discharge_diagnoses: string;
  condition_at_discharge: string;
  treatment_at_discharge?: string;
  recommendations: string;
  warning_signs?: string;
  follow_up_plan: string;
  pending_results?: string;
  signed_at?: string | null;
};

export type TimelineEntry = {
  id: string;
  title: string;
  description: string;
  severity: string;
  occurred_at: string;
  user?: string;
};
