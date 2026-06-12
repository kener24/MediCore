import type { Clinic } from "./clinic";
import type { User } from "./user";

export interface ClinicDashboardStats {
  clinic: Clinic;
  total_users: number;
  active_users: number;
  inactive_users: number;
  total_medicos: number;
  total_enfermeras: number;
  total_recepcionistas: number;
  total_pacientes: number;
}

export type ClinicAdminUser = User;

export interface ClinicUserCreatePayload {
  nombre_completo: string;
  email: string;
  telefono?: string;
  role: string;
  password: string;
  is_active: boolean;
}

export interface ClinicUserUpdatePayload {
  nombre_completo?: string;
  email?: string;
  telefono?: string;
  role?: string;
  is_active?: boolean;
}

export interface MyClinicUpdatePayload {
  nombre?: string;
  rtn?: string;
  telefono?: string;
  correo?: string;
  direccion?: string;
}
