export type DiagnosisType = "presuntivo" | "confirmado" | "diferencial";
export type PrescriptionStatus = "borrador" | "emitida" | "anulada";
export type MedicalOrderStatus = "pendiente" | "en_proceso" | "completada" | "revisada" | "cancelada" | "vencida";
export type MedicalOrderType = "laboratorio" | "imagenologia" | "procedimiento" | "interconsulta" | "otro";
export type MedicalOrderPriority = "baja" | "normal" | "alta" | "urgente";

export interface Diagnosis {
  id: number;
  clinic: number;
  clinic_nombre?: string;
  patient: number;
  patient_nombre?: string;
  doctor: number;
  doctor_nombre?: string;
  consultation: number;
  code: string;
  name: string;
  description: string;
  diagnosis_type: DiagnosisType;
  is_primary: boolean;
  notes: string;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
}

export interface PrescriptionItem {
  id: number;
  prescription: number;
  medication_name: string;
  presentation: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: string;
  route: string;
  route_display?: string;
  instructions: string;
  allergy_warnings?: string[];
  activo: boolean;
}

export interface Prescription {
  id: number;
  clinic: number;
  clinic_nombre?: string;
  patient: number;
  patient_nombre?: string;
  doctor: number;
  doctor_nombre?: string;
  status_display?: string;
  prescription_type_display?: string;
  consultation: number;
  prescription_number: string;
  issue_date: string;
  general_instructions: string;
  status: PrescriptionStatus;
  prescription_type?: "unica" | "repetible";
  max_dispenses?: number | null;
  refill_interval_days?: number | null;
  expires_at?: string | null;
  dispenses_used?: number;
  issued_at?: string | null;
  medications?: string[];
  items?: PrescriptionItem[];
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
}

export interface MedicalOrder {
  id: number;
  clinic: number;
  clinic_nombre?: string;
  patient: number;
  patient_nombre?: string;
  doctor: number;
  doctor_nombre?: string;
  order_type_display?: string;
  priority_display?: string;
  status_display?: string;
  is_expired?: boolean;
  consultation: number;
  order_number: string;
  order_type: MedicalOrderType;
  title: string;
  description: string;
  instructions: string;
  priority: MedicalOrderPriority;
  status: MedicalOrderStatus;
  expires_at?: string | null;
  scheduled_at?: string | null;
  responsible_user?: number | null;
  execution_area?: string;
  started_at?: string | null;
  completed_at?: string | null;
  result_summary?: string;
  reviewed_at?: string | null;
  review_notes?: string;
  cancellation_reason?: string;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
}

export type DiagnosisPayload = Partial<Pick<Diagnosis, "consultation" | "code" | "name" | "description" | "diagnosis_type" | "is_primary" | "notes" | "activo">>;
export type PrescriptionPayload = Partial<Pick<Prescription, "consultation" | "prescription_number" | "issue_date" | "general_instructions" | "status" | "prescription_type" | "max_dispenses" | "refill_interval_days" | "expires_at" | "activo">>;
export type PrescriptionItemPayload = Partial<Omit<PrescriptionItem, "id" | "prescription">>;
export type MedicalOrderPayload = Partial<Pick<MedicalOrder, "consultation" | "order_number" | "order_type" | "title" | "description" | "instructions" | "priority" | "expires_at" | "scheduled_at" | "execution_area" | "activo">>;

export interface PrescriptionFilters {
  patient?: string;
  consultation?: string;
  doctor?: string;
  clinic?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface DiagnosisFilters extends PrescriptionFilters {
  diagnosis_type?: string;
  is_primary?: string;
}

export interface MedicalOrderFilters extends PrescriptionFilters {
  order_type?: string;
  priority?: string;
}

export interface PrescriptionStats {
  total_prescriptions: number;
  draft_prescriptions: number;
  issued_prescriptions: number;
  voided_prescriptions: number;
  total_orders: number;
  pending_orders: number;
  completed_orders: number;
  cancelled_orders: number;
}
