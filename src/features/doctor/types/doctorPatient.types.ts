export type DoctorPatientBasicInfo = {
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
  medical_record_number?: string;
  expediente?: string;
  blood_type?: string | null;
};

export type DoctorVisitDetail = {
  id: number;
  visit_id?: number;
  patient_id?: number;
  paciente_id?: number;
  patient?: DoctorPatientBasicInfo;
  patient_name?: string;
  paciente_nombre?: string;
  visit_type?: string;
  tipo_visita?: string;
  priority?: string;
  prioridad?: string;
  status?: string;
  estado?: string;
  reason?: string;
  motivo?: string;
  arrived_at?: string;
  llegada_en?: string;
  appointment_id?: number | null;
  assigned_doctor_id?: number | null;
  assigned_nurse_id?: number | null;
  triage_completed?: boolean;
  triaje_completado?: boolean;
  consultation_id?: number | null;
};

export type DoctorVitalSigns = {
  id?: number;
  temperature?: number | string | null;
  blood_pressure?: string | null;
  systolic_pressure?: number | string | null;
  diastolic_pressure?: number | string | null;
  heart_rate?: number | string | null;
  respiratory_rate?: number | string | null;
  oxygen_saturation?: number | string | null;
  weight?: number | string | null;
  height?: number | string | null;
  bmi?: number | string | null;
  pain_scale?: number | string | null;
  notes?: string | null;
  created_at?: string;
  creado_en?: string;
  recorded_by_name?: string;
};

export type DoctorTriageInfo = {
  id?: number;
  chief_complaint?: string | null;
  motivo_consulta?: string | null;
  initial_assessment?: string | null;
  evaluacion_inicial?: string | null;
  priority?: string;
  prioridad?: string;
  notes?: string | null;
  notas?: string | null;
  created_at?: string;
  creado_en?: string;
  nurse_name?: string;
  enfermera_nombre?: string;
  vital_signs?: DoctorVitalSigns | null;
};

export type DoctorPatientMedicalSummary = {
  allergies?: string | null;
  alergias?: string | null;
  chronic_diseases?: string | null;
  enfermedades_cronicas?: string | null;
  current_medications?: string | null;
  medicamentos_actuales?: string | null;
  surgical_history?: string | null;
  antecedentes_quirurgicos?: string | null;
  family_history?: string | null;
  antecedentes_familiares?: string | null;
  last_diagnoses?: {
    id?: number;
    diagnosis?: string;
    diagnostico?: string;
    date?: string;
    fecha?: string;
    doctor_name?: string;
  }[];
  last_prescriptions?: {
    id?: number;
    date?: string;
    fecha?: string;
    summary?: string;
    resumen?: string;
    doctor_name?: string;
  }[];
  last_consultations?: {
    id?: number;
    date?: string;
    fecha?: string;
    reason?: string;
    motivo?: string;
    doctor_name?: string;
  }[];
};
