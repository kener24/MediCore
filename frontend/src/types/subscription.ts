export interface SubscriptionPlan {
  id: number;
  name: string;
  code: string;
  description: string;
  price_monthly: string;
  price_yearly: string;
  max_users: number;
  max_doctors: number;
  max_patients: number;
  max_appointments_per_month: number;
  max_storage_mb: number;
  allow_billing: boolean;
  allow_inventory: boolean;
  allow_purchases: boolean;
  allow_reports: boolean;
  allow_audit: boolean;
  allow_notifications: boolean;
  allow_patient_portal: boolean;
  allow_mobile_api: boolean;
  allow_multi_branch: boolean;
  support_level: string;
  active: boolean;
}

export interface ClinicSubscription {
  id: number;
  clinic: number;
  clinic_nombre?: string;
  plan: number;
  plan_nombre?: string;
  plan_code?: string;
  status: string;
  billing_cycle: string;
  start_date: string;
  end_date: string | null;
  trial_end_date: string | null;
  next_payment_date: string | null;
  cancelled_at: string | null;
  suspension_reason: string;
  notes: string;
  active: boolean;
}

export interface PlanUsage {
  plan: string;
  plan_code: string;
  status: string;
  max_users: number;
  users_count: number;
  max_doctors: number;
  doctors_count: number;
  max_patients: number;
  patients_count: number;
  max_appointments_per_month: number;
  appointments_this_month: number;
  max_storage_mb: number;
  storage_used_mb: number;
}

export type SubscriptionFeatures = Record<string, boolean>;

