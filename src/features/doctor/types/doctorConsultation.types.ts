export type DoctorVitalSigns = {
  id?: number;
  temperature?: string | number | null;
  blood_pressure?: string | null;
  heart_rate?: string | number | null;
  respiratory_rate?: string | number | null;
  oxygen_saturation?: string | number | null;
  weight?: string | number | null;
  height?: string | number | null;
  notes?: string | null;
  created_at?: string;
  creado_en?: string;
};

export type DoctorPatientSummary = {
  id?: number;
  full_name?: string;
  nombre_completo?: string;
  age?: number | string;
  edad?: number | string;
  gender?: string;
  genero?: string;
  phone?: string;
  telefono?: string;
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
  status?: string;
  diagnosis_text?: string;
};

export type ConsultationPayload = {
  chief_complaint?: string;
  history_present_illness?: string;
  physical_examination?: string;
  assessment?: string;
  diagnosis_text?: string;
  plan?: string;
  recommendations?: string;
};

export type DoctorConsultation = ConsultationPayload & {
  id?: number;
  visit_id?: number;
  status?: string;
  patient?: DoctorPatientSummary;
  patient_name?: string;
};
