export interface ClinicSettings {
  id: number;
  clinic: number;
  clinic_nombre?: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  currency: string;
  country: string;
  timezone: string;
  language: string;
  tax_enabled: boolean;
  default_tax_rate: string;
  invoice_prefix: string;
  patient_prefix: string;
  medical_record_prefix: string;
  prescription_prefix: string;
  medical_order_prefix: string;
  purchase_order_prefix: string;
  appointment_duration_minutes: number;
  allow_online_appointments: boolean;
  allow_patient_cancellations: boolean;
  cancellation_hours_limit: number;
  require_appointment_confirmation: boolean;
  allow_patient_portal: boolean;
  allow_patient_medical_record_view: boolean;
  allow_patient_prescription_view: boolean;
  allow_patient_invoice_view: boolean;
  business_start_time: string;
  business_end_time: string;
  working_days: string[];
  fiscal_name: string;
  fiscal_rtn: string;
  fiscal_address: string;
  fiscal_phone: string;
  fiscal_email: string;
  footer_invoice_text: string;
  terms_and_conditions: string;
  privacy_policy: string;
  active: boolean;
}

export type ClinicSettingsPayload = Partial<ClinicSettings>;

export interface ClinicWorkflowSettings {
  id: number;
  clinic: number;
  clinic_nombre?: string;
  allow_walk_in_patients: boolean;
  allow_appointments: boolean;
  allow_online_appointments: boolean;
  allow_in_person_appointments: boolean;
  reception_can_create_minimal_patient: boolean;
  reception_handles_cashier: boolean;
  walk_in_requires_triage: boolean;
  appointment_requires_triage: boolean;
  appointment_direct_to_doctor: boolean;
  billing_before_consultation: boolean;
  billing_after_consultation: boolean;
  require_payment_before_consultation: boolean;
  allow_consultation_without_payment: boolean;
  require_identity_for_patient: boolean;
  require_phone_for_patient: boolean;
  allow_doctor_to_create_patient: boolean;
  allow_nurse_to_edit_patient_basic_data: boolean;
  auto_send_to_billing_after_consultation: boolean;
  auto_complete_visit_after_payment: boolean;
  active: boolean;
}

export type ClinicWorkflowSettingsPayload = Partial<ClinicWorkflowSettings>;
