export type SuperAdminDashboard = {
  total_clinics?: number;
  active_clinics?: number;
  inactive_clinics?: number;
  total_users?: number;
  active_users?: number;
  inactive_users?: number;
  total_admins?: number;
  total_medicos?: number;
  total_pacientes?: number;
  total_enfermeras?: number;
  critical_alerts?: number;
  alerts_count?: number;
  usage?: { appointments?: number; consultations?: number; invoices?: number; active_hospitalizations?: number };
  subscriptions?: { total?: number; active?: number; trial?: number; suspended?: number; expired?: number; by_status?: Record<string, number> };
};

export type SuperAdminClinic = {
  id: number;
  nombre?: string;
  rtn?: string;
  telefono?: string;
  correo?: string;
  direccion?: string;
  activo?: boolean;
  creado_en?: string;
  actualizado_en?: string;
  plan?: string | null;
  subscription_status?: string | null;
  subscription_end_date?: string | null;
  users_count?: number;
  doctors_count?: number;
  patients_count?: number;
};

export type SuperAdminPlan = {
  id: number;
  name: string;
  code: string;
  description?: string;
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
  active: boolean;
};

export type SuperAdminSubscription = {
  id: number;
  clinic: number;
  clinic_nombre?: string;
  plan: number;
  plan_nombre?: string;
  plan_code?: string;
  status: string;
  billing_cycle: string;
  start_date: string;
  end_date?: string | null;
  trial_end_date?: string | null;
  suspension_reason?: string;
  active: boolean;
};

export type SuperAdminUsage = {
  clinic_id: number;
  clinic_name: string;
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
};

export type SuperAdminAlert = {
  id: string;
  code: string;
  severity: 'critical' | 'warning' | 'info';
  clinic_id: number;
  clinic_name: string;
  message: string;
};

export type SuperAdminSystemStatus = {
  api: string;
  database: string;
  task_queue: string;
  scheduler: string;
  backup: { status: string; last_confirmed_at?: string | null };
  version: string;
  environment: string;
  checked_at: string;
};

export type SuperAdminUser = {
  id: number;
  nombre_completo?: string;
  email: string;
  telefono?: string;
  role?: number | { id?: number; nombre?: string };
  role_nombre?: string;
  clinica?: number | null;
  clinica_nombre?: string;
  is_active?: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
  ultimo_acceso?: string | null;
};

export type SuperAdminRole = {
  id: number;
  nombre: string;
  descripcion?: string;
};

export type SuperAdminAuditLog = {
  id: number;
  action?: string;
  module?: string;
  description?: string;
  user_email?: string;
  user_role?: string;
  clinic?: number | null;
  created_at?: string;
  severity?: string;
  status?: string;
};

export type CreateClinicPayload = {
  correo?: string;
  direccion?: string;
  nombre: string;
  rtn?: string;
  telefono?: string;
};

export type UpdateClinicPayload = Partial<CreateClinicPayload>;

export type CreateClinicAdminPayload = {
  clinica: number;
  email: string;
  is_active?: boolean;
  nombre_completo: string;
  password: string;
  role: number;
  telefono?: string;
};

export type UpdateClinicAdminPayload = {
  clinica?: number;
  email?: string;
  is_active?: boolean;
  nombre_completo?: string;
  role?: number;
  telefono?: string;
};

export type ListResponse<T> = T[] | { results?: T[]; data?: T[]; items?: T[]; count?: number };
