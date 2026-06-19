export interface HospitalizationDashboard {
  active_patients: number;
  observation_patients: number;
  available_beds: number;
  occupied_beds: number;
  cleaning_beds: number;
  maintenance_beds: number;
  discharges_today: number;
  urgent_notes: number;
  recent_vital_signs: number;
}

export interface HospitalRoom {
  id: number;
  name: string;
  room_number: string;
  floor?: string;
  room_type: string;
  description?: string;
  is_active: boolean;
  beds_count?: number;
  occupied_beds?: number;
}

export interface HospitalBed {
  id: number;
  room: number;
  room_name?: string;
  room_number?: string;
  bed_number: string;
  bed_code: string;
  status: string;
  is_active: boolean;
  notes?: string;
  current_patient?: string;
  current_hospitalization?: number | null;
}

export interface HospitalVitalSigns {
  id: number;
  temperature?: string;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  heart_rate?: number;
  respiratory_rate?: number;
  oxygen_saturation?: number;
  weight?: string;
  height?: string;
  bmi?: string;
  glucose?: number;
  pain_scale?: number;
  notes?: string;
  recorded_by_name?: string;
  recorded_at: string;
}

export interface NursingNote {
  id: number;
  note_type: string;
  title?: string;
  note: string;
  created_by_name?: string;
  recorded_at: string;
}

export interface NursingRound {
  id: number;
  round_type: string;
  status: string;
  notes?: string;
  general_condition?: string;
  pain_level?: number;
  consciousness_status?: string;
  mobility_status?: string;
  feeding_status?: string;
  elimination_status?: string;
  nurse_name?: string;
  created_at?: string;
  creado_en?: string;
}

export interface MedicationAdministration {
  id: number;
  medication_name: string;
  dosage: string;
  route: string;
  scheduled_time?: string | null;
  administered_time?: string | null;
  status: string;
  administered_by_name?: string;
  notes?: string;
  omission_reason?: string;
  patient_name?: string;
  created_at?: string;
}

export interface Hospitalization {
  id: number;
  patient: number;
  patient_name: string;
  patient_code?: string;
  visit?: number | null;
  consultation?: number | null;
  admission_source: string;
  responsible_doctor?: number | null;
  responsible_doctor_name?: string;
  current_bed?: number | null;
  current_bed_code?: string;
  current_room?: string;
  status: string;
  reason: string;
  diagnosis_at_admission?: string;
  admission_datetime: string;
  discharge_datetime?: string | null;
  discharge_reason?: string;
  discharge_notes?: string;
  transfer_notes?: string;
  recent_vital_signs?: HospitalVitalSigns[];
  recent_nursing_notes?: NursingNote[];
  nursing_rounds?: NursingRound[];
  medication_administrations?: MedicationAdministration[];
  events?: Array<{ id: number; event_type: string; description: string; creado_en: string; created_by_name?: string }>;
}

export interface HospitalizationCreatePayload {
  patient: number;
  visit?: number | null;
  consultation?: number | null;
  admission_source: string;
  responsible_doctor?: number | null;
  bed?: number | null;
  status?: string;
  reason: string;
  diagnosis_at_admission?: string;
}
