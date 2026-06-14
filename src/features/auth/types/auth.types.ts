export type AppRole = 'paciente' | 'medico' | 'recepcionista' | 'enfermera' | 'admin';

export type RoleName = AppRole | 'superadmin' | string;

export interface ClinicSummary {
  id: number;
  nombre: string;
  correo?: string;
  telefono?: string;
}

export interface RoleSummary {
  id: number;
  nombre: RoleName;
  descripcion?: string;
}

export interface User {
  id: number;
  nombre_completo: string;
  email: string;
  telefono?: string;
  avatar_url?: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  role: number | RoleSummary;
  role_nombre?: RoleName;
  clinica: number | ClinicSummary | null;
  clinica_nombre?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  session_key?: string;
  user?: User;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface SessionData {
  accessToken: string | null;
  refreshToken: string | null;
  sessionKey: string | null;
  user: User | null;
}
