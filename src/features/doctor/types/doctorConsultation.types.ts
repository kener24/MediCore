export type ConsultationStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled' | 'pending' | string;

export type DoctorVitalSigns = {
  id?: number;
  temperature?: string | number | null;
  blood_pressure?: string | null;
  systolic_pressure?: string | number | null;
  diastolic_pressure?: string | number | null;
  heart_rate?: string | number | null;
  respiratory_rate?: string | number | null;
  oxygen_saturation?: string | number | null;
  weight?: string | number | null;
  height?: string | number | null;
  bmi?: string | number | null;
  pain_scale?: string | number | null;
  notes?: string | null;
  created_at?: string;
  creado_en?: string;
  recorded_by_name?: string;
};

export type DoctorPatientSummary = {
  id?: number;
  full_name?: string;
  nombre_completo?: string;
  first_name?: string;
  last_name?: string;
  age?: number | string;
  edad?: number | string;
  gender?: string;
  genero?: string;
  phone?: string;
  telefono?: string;
  email?: string;
  identity_number?: string;
  identidad?: string;
  patient_code?: string;
  codigo_paciente?: string;
  allergies?: string | null;
  alergias?: string | null;
  chronic_diseases?: string | null;
  enfermedades_cronicas?: string | null;
  blood_type?: string | null;
  medical_record_number?: string;
  expediente?: string;
};

export type DoctorConsultationSummary = {
  id?: number;
  patient_name?: string;
  created_at?: string;
  status?: ConsultationStatus;
  diagnosis_text?: string;
};

export type ConsultationFormValues = {
  chief_complaint: string;
  history_present_illness: string;
  physical_examination: string;
  assessment: string;
  diagnosis_text: string;
  plan: string;
  recommendations: string;
  notes: string;
};

export type ConsultationFiltersState = {
  date?: string;
  search?: string;
  status?: string;
};

export type ConsultationPayload = {
  visit?: number | string;
  patient?: number | string | DoctorPatientSummary;
  chief_complaint?: string;
  history_present_illness?: string;
  physical_examination?: string;
  assessment?: string;
  diagnosis_text?: string;
  preliminary_diagnosis?: string;
  plan?: string;
  symptoms?: string;
  physical_exam?: string;
  clinical_assessment?: string;
  treatment_plan?: string;
  recommendations?: string;
  notes?: string;
  private_notes?: string;
  status?: ConsultationStatus;
};

export type DoctorConsultation = ConsultationPayload & {
  id?: number;
  consultation_id?: number;
  appointment_id?: number | null;
  appointment?: number | null;
  visit_id?: number;
  patient_visit?: number | null;
  patient_id?: number;
  patient_name?: string;
  patient_nombre?: string;
  patient_codigo?: string;
  doctor_id?: number;
  doctor_name?: string;
  doctor_nombre?: string;
  status?: ConsultationStatus;
  priority?: string;
  reason?: string;
  patient?: DoctorPatientSummary | number | string;
  vital_signs?: unknown;
  triage?: unknown;
  prescriptions?: unknown[];
  medical_orders?: unknown[];
  consumptions?: unknown[];
  started_at?: string;
  completed_at?: string | null;
  created_at?: string;
  consultation_date?: string;
  creado_en?: string;
  actualizado_en?: string;
  updated_at?: string;
};

export type StartConsultationResponse = {
  id?: number;
  consultation_id?: number;
  visit_id?: number;
  status?: string;
  message?: string;
};
