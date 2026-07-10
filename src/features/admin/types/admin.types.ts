import type { RoleName } from '@/features/auth/types/auth.types';

export type AdminClinic = {
  id?: number;
  nombre?: string;
  name?: string;
  correo?: string;
  email?: string;
  telefono?: string;
  phone?: string;
  direccion?: string;
  address?: string;
  rtn?: string;
  activo?: boolean;
  active?: boolean;
};

export type AdminDashboard = {
  clinic?: AdminClinic;
  total_users?: number;
  active_users?: number;
  inactive_users?: number;
  total_medicos?: number;
  total_enfermeras?: number;
  total_recepcionistas?: number;
  total_pacientes?: number;
};

export type AdminUser = {
  id: number;
  nombre_completo?: string;
  full_name?: string;
  email: string;
  telefono?: string;
  phone?: string;
  role_nombre?: RoleName;
  role?: { id?: number; nombre?: RoleName; name?: RoleName } | number | string;
  is_active?: boolean;
  last_login?: string | null;
};

export type AdminReportSummary = {
  patients?: number;
  appointments?: number;
  consultations?: number;
  invoices?: number;
  payments?: number | string;
  revenue?: number | string;
  low_stock?: number;
  [key: string]: unknown;
};

export type AdminFiscalReadiness = {
  ready?: boolean;
  is_ready?: boolean;
  profile_complete?: boolean;
  has_active_range?: boolean;
  active_range?: boolean;
  errors?: string[];
  warnings?: string[];
  message?: string;
};

export type AdminFiscalRange = {
  id: number;
  document_type?: string;
  cai?: string;
  current_number?: number;
  start_number?: number;
  end_number?: number;
  full_start_number?: string;
  full_end_number?: string;
  expiration_date?: string;
  is_active?: boolean;
  is_exhausted?: boolean;
};

export type AdminAuditLog = {
  id: number;
  action?: string;
  module?: string;
  description?: string;
  user_email?: string;
  created_at?: string;
  severity?: string;
  status?: string;
};

export type AdminSubscription = {
  plan_name?: string;
  status?: string;
  starts_at?: string;
  ends_at?: string;
  current_period_end?: string;
};

export type AdminUsage = {
  users?: number;
  patients?: number;
  storage?: number | string;
  appointments?: number;
  [key: string]: unknown;
};

export type AdminListResponse<T> = T[] | { results?: T[]; data?: T[]; items?: T[]; count?: number };

