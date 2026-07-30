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
  is_abnormal?: boolean;
  alert_summary?: string;
}

export interface NursingNote {
  id: number;
  note_type: string;
  title?: string;
  note: string;
  created_by_name?: string;
  recorded_at: string;
  shift?: string;
  status?: string;
  correction_of?: number | null;
}

export interface MedicalEvolution {
  id: number;
  doctor_name?: string;
  status: "draft" | "signed" | "correction";
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  progress_notes?: string;
  diagnosis_changes?: string;
  treatment_changes?: string;
  observations?: string;
  signed_at?: string | null;
  correction_of?: number | null;
  correction_reason?: string;
  creado_en: string;
}

export interface TreatmentPlan {
  id: number;
  doctor_name?: string;
  version: number;
  status: string;
  goals?: string;
  treatment?: string;
  diet?: string;
  activity?: string;
  monitoring?: string;
  precautions?: string;
  change_reason?: string;
  creado_en: string;
}

export interface MedicalInstruction {
  id: number;
  doctor_name?: string;
  instruction_type: string;
  priority: string;
  title: string;
  details: string;
  status: string;
  inventory_item?: number | null;
  generic_name?: string;
  concentration?: string;
  dose?: string | null;
  dose_unit?: string;
  route?: string;
  interval_hours?: number | null;
  inventory_quantity?: string;
  as_needed?: boolean;
  maximum_daily_dose?: string | null;
  allergy_warning?: string;
  allergy_override_reason?: string;
  version?: number;
  effective_from?: string;
  effective_until?: string | null;
  scheduled_for?: string | null;
  acknowledged_by_name?: string;
  acknowledged_at?: string | null;
  completed_at?: string | null;
  creado_en: string;
}

export interface HospitalTimelineEntry {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: string;
  occurred_at: string;
  user?: string;
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
  status_recorded_at?: string | null;
  delay_minutes?: number;
  status: string;
  administered_by_name?: string;
  notes?: string;
  omission_reason?: string;
  patient_name?: string;
  instruction?: number | null;
  inventory_item?: number | null;
  selected_lot?: number | null;
  ordered_dose?: string | null;
  administered_dose?: string | null;
  dose_unit?: string;
  inventory_quantity?: string;
  administered_quantity?: string | null;
  refusal_reason?: string;
  unavailable_reason?: string;
  delay_reason?: string;
  reversal_reason?: string;
  created_at?: string;
}

export interface DischargeSummary {
  id: number;
  version: number;
  status: "draft" | "signed" | "replaced";
  discharge_type: string;
  hospital_course: string;
  discharge_diagnoses: string;
  condition_at_discharge: string;
  recommendations: string;
  follow_up_plan: string;
  admission_summary?: string;
  procedures?: string;
  relevant_findings?: string;
  treatment_at_discharge?: string;
  warning_signs?: string;
  pending_results?: string;
  prescription?: number | null;
  signed_at?: string | null;
  doctor_name?: string;
}

export interface HospitalConsumption {
  id: number;
  inventory_item: number;
  inventory_item_name: string;
  inventory_lot?: number | null;
  inventory_lot_number?: string;
  quantity: string;
  usage_type: string;
  description: string;
  notes?: string;
  billable: boolean;
  total_price: string;
  status: string;
  invoiced: boolean;
  applied_at: string;
}

export interface Hospitalization {
  id: number;
  patient: number;
  patient_name: string;
  patient_code?: string;
  patient_identity?: string;
  patient_birth_date?: string | null;
  patient_allergies?: string;
  patient_chronic_diseases?: string;
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
  expected_discharge_date?: string | null;
  discharge_reason?: string;
  discharge_notes?: string;
  transfer_notes?: string;
  recent_vital_signs?: HospitalVitalSigns[];
  recent_nursing_notes?: NursingNote[];
  nursing_rounds?: NursingRound[];
  medication_administrations?: MedicationAdministration[];
  events?: Array<{ id: number; event_type: string; description: string; creado_en: string; created_by_name?: string }>;
  active_treatment_plan?: TreatmentPlan | null;
  active_instructions?: MedicalInstruction[];
  recent_evolutions?: MedicalEvolution[];
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
  expected_discharge_date?: string | null;
}
