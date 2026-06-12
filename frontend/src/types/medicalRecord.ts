export type ConsultationStatus = "borrador" | "finalizada" | "anulada";
export type ClinicalSupplyUsageStatus = "pending" | "applied" | "cancelled" | "invoiced";
export type ClinicalSupplyUsageType = "medication" | "supply" | "procedure_supply" | "injection" | "serum" | "wound_care" | "nebulization" | "other";

export interface MedicalRecord {
  id: number;
  clinic: number;
  clinic_nombre?: string;
  patient: number;
  patient_nombre?: string;
  patient_identidad?: string;
  patient_codigo?: string;
  record_number: string;
  blood_type: string;
  allergies: string;
  chronic_diseases: string;
  surgical_history: string;
  family_history: string;
  current_medications: string;
  general_notes: string;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
}

export interface VitalSigns {
  id: number;
  consultation: number;
  patient_visit?: number | null;
  temperature: string | null;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  heart_rate: number | null;
  respiratory_rate: number | null;
  oxygen_saturation: number | null;
  weight: string | null;
  height: string | null;
  bmi: string | null;
  glucose: number | null;
  pain_scale?: number | null;
  notes: string;
  registrado_por?: number | null;
  registrado_por_nombre?: string;
  recorded_at?: string;
  creado_en?: string;
  actualizado_en?: string;
}

export interface ClinicalConsultation {
  id: number;
  clinic: number;
  clinic_nombre?: string;
  medical_record: number;
  record_number?: string;
  patient: number;
  patient_nombre?: string;
  patient_codigo?: string;
  doctor: number;
  doctor_nombre?: string;
  specialty_nombre?: string;
  appointment: number | null;
  consultation_date: string;
  start_time: string | null;
  end_time: string | null;
  chief_complaint: string;
  symptoms: string;
  physical_exam: string;
  clinical_assessment: string;
  preliminary_diagnosis: string;
  treatment_plan: string;
  recommendations: string;
  private_notes: string;
  status: ConsultationStatus;
  void_reason?: string;
  created_by?: number | null;
  created_by_nombre?: string;
  finalized_by?: number | null;
  finalized_by_nombre?: string;
  finalized_at?: string | null;
  vital_signs?: VitalSigns;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
}

export interface MedicalRecordFilters {
  search?: string;
  clinic?: string;
  patient?: string;
  is_active?: string;
}

export interface ConsultationFilters {
  search?: string;
  clinic?: string;
  patient?: string;
  doctor?: string;
  appointment?: string;
  date?: string;
  date_from?: string;
  date_to?: string;
  status?: string;
}

export type MedicalRecordPayload = Partial<Pick<MedicalRecord, "patient" | "record_number" | "blood_type" | "allergies" | "chronic_diseases" | "surgical_history" | "family_history" | "current_medications" | "general_notes" | "activo">>;

export interface ConsultationPayload {
  medical_record?: number | string;
  patient?: number | string;
  doctor?: number | string;
  appointment?: number | string | null;
  consultation_date?: string;
  start_time?: string;
  end_time?: string;
  chief_complaint?: string;
  symptoms?: string;
  physical_exam?: string;
  clinical_assessment?: string;
  preliminary_diagnosis?: string;
  treatment_plan?: string;
  recommendations?: string;
  private_notes?: string;
  status?: ConsultationStatus;
}

export type VitalSignsPayload = Partial<Omit<VitalSigns, "id" | "consultation" | "bmi" | "registrado_por" | "registrado_por_nombre" | "creado_en" | "actualizado_en">>;

export interface ClinicalHistory {
  patient: Record<string, unknown>;
  medical_record: MedicalRecord | null;
  consultations: ClinicalConsultation[];
  diagnoses?: unknown[];
  prescriptions?: unknown[];
  medical_orders?: unknown[];
  future_sections: Record<string, unknown[]>;
}

export interface MedicalRecordStats {
  total_records: number;
  active_records: number;
  total_consultations: number;
  consultations_today: number;
  draft_consultations: number;
  finalized_consultations: number;
}

export interface ClinicalSupplyUsage {
  id: number;
  clinic: number;
  patient: number;
  patient_nombre?: string;
  consultation: number | null;
  appointment: number | null;
  doctor: number | null;
  doctor_nombre?: string;
  inventory_item: number;
  inventory_item_nombre?: string;
  inventory_item_type?: string;
  inventory_item_stock?: string;
  inventory_lot: number | null;
  inventory_lot_number?: string;
  quantity: string;
  unit_cost: string;
  unit_price: string;
  total_price: string;
  usage_type: ClinicalSupplyUsageType;
  description: string;
  notes: string;
  billable: boolean;
  invoiced: boolean;
  invoice: number | null;
  invoice_item: number | null;
  inventory_movement: number | null;
  applied_by_nombre?: string;
  applied_at: string;
  status: ClinicalSupplyUsageStatus;
  active: boolean;
}
