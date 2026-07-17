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

export type UpdateAdminClinicPayload = {
  correo?: string;
  direccion?: string;
  nombre?: string;
  rtn?: string;
  telefono?: string;
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
  ultimo_acceso?: string | null;
  email_verified?: boolean;
  last_login_ip?: string | null;
  password_changed_at?: string | null;
  date_joined?: string | null;
  creado_en?: string | null;
  actualizado_en?: string | null;
};

export type UpdateAdminUserPayload = {
  email?: string;
  is_active?: boolean;
  nombre_completo?: string;
  role?: 'admin' | 'medico' | 'enfermera' | 'recepcionista' | 'paciente';
  telefono?: string;
};

export type AdminDoctorProfile = {
  id: number;
  user?: number | { id?: number; email?: string; nombre_completo?: string };
  user_nombre?: string;
  user_email?: string;
  specialty?: number;
  specialty_nombre?: string;
  numero_colegiacion?: string;
  titulo_profesional?: string;
  biografia?: string;
  tarifa_consulta?: string | number;
  duracion_consulta_minutos?: number;
  atiende_virtual?: boolean;
  atiende_presencial?: boolean;
  activo?: boolean;
};

export type UpdateAdminDoctorProfilePayload = {
  atiende_presencial?: boolean;
  atiende_virtual?: boolean;
  duracion_consulta_minutos?: number;
  numero_colegiacion?: string;
  specialty?: number;
  tarifa_consulta?: string;
  titulo_profesional?: string;
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

export type AdminAccountLock = {
  id: number;
  user?: number;
  user_email?: string;
  user_nombre?: string;
  locked_until?: string | null;
  reason?: string;
  failed_attempts?: number;
  active?: boolean;
  created_at?: string;
  unlocked_at?: string | null;
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

export type AdminRolePermissions = Record<string, Record<string, string[]>>;

export type AdminSpecialty = {
  id: number;
  nombre?: string;
  name?: string;
  descripcion?: string;
  activo?: boolean;
};

export type CreateClinicUserPayload = {
  email: string;
  is_active?: boolean;
  nombre_completo: string;
  password: string;
  role: 'medico' | 'enfermera' | 'recepcionista';
  telefono?: string;
};

export type CreateDoctorProfilePayload = {
  atiende_presencial?: boolean;
  atiende_virtual?: boolean;
  duracion_consulta_minutos?: number;
  numero_colegiacion: string;
  specialty: number;
  tarifa_consulta?: string;
  titulo_profesional?: string;
  user: number;
};

export type AdminListResponse<T> = T[] | { results?: T[]; data?: T[]; items?: T[]; count?: number };
