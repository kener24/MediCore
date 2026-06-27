import type { VitalSigns } from "./medicalRecord";

export type VisitType = "walk_in" | "appointment" | "emergency" | "follow_up" | "control" | "procedure";
export type VisitPriority = "normal" | "priority" | "urgent" | "emergency";
export type VisitStatus = "registered" | "waiting_triage" | "in_triage" | "waiting_doctor" | "in_consultation" | "consultation_finished" | "waiting_billing" | "waiting_payment" | "paid" | "completed" | "cancelled" | "no_show";

export interface PatientVisit {
  id: number;
  clinic: number;
  patient: number;
  patient_nombre?: string;
  patient_codigo?: string;
  patient_identidad?: string;
  appointment: number | null;
  medical_record: number;
  consultation: number | null;
  invoice: number | null;
  visit_number: string;
  visit_date: string;
  arrival_time: string;
  triage_started_at: string | null;
  triage_completed_at: string | null;
  consultation_started_at: string | null;
  consultation_completed_at: string | null;
  checkout_at: string | null;
  visit_type: VisitType;
  priority: VisitPriority;
  status: VisitStatus;
  reason: string;
  symptoms: string;
  notes: string;
  assigned_doctor: number | null;
  assigned_doctor_nombre?: string;
  assigned_nurse: number | null;
  assigned_nurse_nombre?: string;
  vital_signs?: VitalSigns | null;
  active: boolean;
}

export interface AdmissionStats {
  registered_today: number;
  waiting_triage: number;
  in_triage: number;
  waiting_doctor: number;
  in_consultation: number;
  waiting_billing: number;
  completed: number;
  cancelled: number;
}
