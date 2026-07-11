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

export type ListResponse<T> = T[] | { results?: T[]; data?: T[]; items?: T[]; count?: number };

