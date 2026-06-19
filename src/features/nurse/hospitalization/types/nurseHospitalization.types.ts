export type HospitalizationStatus =
  | 'active'
  | 'observation'
  | 'transferred'
  | 'discharged'
  | 'cancelled'
  | string;

export type BedStatus =
  | 'available'
  | 'occupied'
  | 'cleaning'
  | 'maintenance'
  | 'blocked'
  | string;

export type HospitalRoom = {
  id?: number;
  name?: string;
  room_number?: string;
  floor?: string;
  room_type?: string;
};

export type HospitalBed = {
  id?: number;
  room?: number | HospitalRoom | null;
  room_name?: string;
  room_number?: string;
  bed_number?: string;
  bed_code?: string;
  status?: BedStatus;
  notes?: string | null;
  current_patient?: string;
  current_hospitalization?: number | null;
};

export type InpatientPatient = {
  id?: number;
  full_name?: string;
  nombre_completo?: string;
  first_name?: string;
  last_name?: string;
  nombres?: string;
  apellidos?: string;
  age?: number | string;
  gender?: string;
  genero?: string;
  phone?: string;
  telefono?: string;
  identity_number?: string;
  identidad?: string;
  patient_code?: string;
  codigo_paciente?: string;
  medical_record_number?: string;
  blood_type?: string | null;
  tipo_sangre?: string | null;
  allergies?: string | null;
  alergias?: string | null;
  chronic_diseases?: string | null;
  enfermedades_cronicas?: string | null;
};

export type NurseHospitalizationListItem = {
  id: number;
  patient?: number | InpatientPatient | null;
  patient_id?: number;
  patient_name?: string;
  patient_code?: string;
  patient_age?: number | string;
  patient_gender?: string;
  current_bed?: number | HospitalBed | null;
  current_bed_code?: string;
  current_room?: string;
  room_name?: string;
  bed_code?: string;
  responsible_doctor_name?: string;
  status?: HospitalizationStatus;
  reason?: string;
  diagnosis_at_admission?: string | null;
  admission_datetime?: string;
  days_hospitalized?: number | string;
};

export type InpatientVitalSignsPayload = {
  temperature?: number | string;
  systolic_pressure?: number | string;
  diastolic_pressure?: number | string;
  blood_pressure_systolic?: number | string;
  blood_pressure_diastolic?: number | string;
  blood_pressure?: string;
  heart_rate?: number | string;
  respiratory_rate?: number | string;
  oxygen_saturation?: number | string;
  weight?: number | string;
  height?: number | string;
  bmi?: number | string;
  glucose?: number | string;
  pain_scale?: number | string;
  notes?: string;
};

export type InpatientVitalSigns = InpatientVitalSignsPayload & {
  id?: number;
  hospitalization?: number;
  hospitalization_id?: number;
  patient_id?: number;
  recorded_by_name?: string;
  recorded_at?: string;
  created_at?: string;
  creado_en?: string;
};

export type NursingNotePriority = 'normal' | 'important' | 'urgent' | string;

export type NursingNoteType =
  | 'observation'
  | 'evolution'
  | 'incident'
  | 'medication_related'
  | 'care'
  | 'other'
  | 'normal'
  | 'important'
  | 'urgent'
  | 'medication'
  | string;

export type NursingNotePayload = {
  note_type: NursingNoteType;
  priority?: NursingNotePriority;
  content: string;
  title?: string;
};

export type NursingNote = NursingNotePayload & {
  id?: number;
  hospitalization?: number;
  hospitalization_id?: number;
  patient_id?: number;
  note?: string;
  created_by_name?: string;
  nurse_name?: string;
  recorded_at?: string;
  created_at?: string;
  updated_at?: string;
  creado_en?: string;
  actualizado_en?: string;
};

export type HospitalizationEvent = {
  id?: number;
  event_type?: string;
  description?: string;
  previous_status?: string | null;
  new_status?: string | null;
  created_by_name?: string;
  created_at?: string;
  creado_en?: string;
  metadata?: Record<string, unknown>;
};

export type NurseHospitalizationDetail = NurseHospitalizationListItem & {
  patient?: InpatientPatient | number | null;
  visit_id?: number | null;
  consultation_id?: number | null;
  discharge_datetime?: string | null;
  discharge_reason?: string | null;
  discharge_notes?: string | null;
  recent_vital_signs?: InpatientVitalSigns[];
  recent_nursing_notes?: NursingNote[];
  recent_events?: HospitalizationEvent[];
  events?: HospitalizationEvent[];
};

export type NurseHospitalizationDashboard = {
  active_patients?: number;
  observation_patients?: number;
  available_beds?: number;
  occupied_beds?: number;
  cleaning_beds?: number;
  maintenance_beds?: number;
  blocked_beds?: number;
  urgent_notes?: number;
  recent_admissions?: number;
  recent_vital_signs?: number;
  discharges_today?: number;
};

export type HospitalizationFilter = 'active' | 'observation' | 'all';
export type VitalSignsFilter = 'today' | '24h' | 'all';
export type NursingNotesFilter = 'all' | 'urgent' | 'incident' | 'today';

export type NursingRound = {
  id?: number;
  hospitalization_id?: number;
  hospitalization?: number;
  patient_id?: number;
  nurse_name?: string;
  round_type?: string;
  status?: string;
  general_condition?: string;
  pain_level?: number | string;
  consciousness_status?: string;
  mobility_status?: string;
  feeding_status?: string;
  elimination_status?: string;
  notes?: string;
  created_at?: string;
  creado_en?: string;
};

export type NursingRoundPayload = {
  round_type: string;
  general_condition?: string;
  pain_level?: number | string;
  consciousness_status?: string;
  mobility_status?: string;
  feeding_status?: string;
  elimination_status?: string;
  notes?: string;
};

export type MedicationAdministration = {
  id?: number;
  hospitalization_id?: number;
  hospitalization?: number;
  patient_id?: number;
  patient_name?: string;
  medication_name?: string;
  dosage?: string;
  route?: string;
  scheduled_time?: string | null;
  administered_time?: string | null;
  status?: string;
  administered_by_name?: string;
  notes?: string;
  omission_reason?: string;
  created_at?: string;
  creado_en?: string;
};

export type MedicationAdministrationPayload = {
  medication_name: string;
  dosage: string;
  route?: string;
  scheduled_time?: string;
  notes?: string;
};
