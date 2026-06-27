export type VisitStatus =
  | 'registered'
  | 'waiting_triage'
  | 'in_triage'
  | 'waiting_doctor'
  | 'in_consultation'
  | 'consultation_finished'
  | 'waiting_payment'
  | 'waiting_billing'
  | 'paid'
  | 'completed'
  | 'cancelled'
  | string;

export type VisitType = 'walk_in' | 'appointment' | 'emergency' | 'follow_up' | string;

export type ReceptionVisit = {
  id?: number;
  patient_id?: number;
  patient?: number;
  patient_name?: string;
  patient_nombre?: string;
  patient_age?: number | string;
  patient_gender?: string;
  visit_type?: VisitType;
  status?: VisitStatus;
  reason?: string;
  priority?: string;
  doctor_id?: number;
  assigned_doctor?: number;
  doctor_name?: string;
  assigned_doctor_nombre?: string;
  appointment_id?: number | null;
  appointment?: number | null;
  invoice?: number | null;
  invoice_id?: number | null;
  arrived_at?: string;
  arrival_time?: string;
  visit_date?: string;
  visit_number?: string;
  created_at?: string;
  creado_en?: string;
};

export type CreateAdmissionPayload = {
  patient_id: number;
  visit_type?: VisitType;
  reason?: string;
  doctor_id?: number;
  appointment_id?: number;
  priority?: string;
};

export type ReceptionStats = {
  registered_today?: number;
  today_appointments?: number;
  today_admissions?: number;
  waiting_triage?: number;
  in_triage?: number;
  waiting_doctor?: number;
  in_consultation?: number;
  waiting_billing?: number;
  completed?: number;
  cancelled?: number;
};
