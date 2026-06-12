import type { Clinic } from "./clinic";
import type { Role } from "./role";

export interface User {
  id: number;
  nombre_completo: string;
  email: string;
  telefono: string;
  avatar_url: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  ultimo_acceso: string | null;
  date_joined: string;
  creado_en?: string;
  actualizado_en?: string;
  role: number | Role;
  role_nombre?: string;
  clinica: number | Clinic | null;
  clinica_nombre?: string;
}

export interface UserPayload {
  nombre_completo: string;
  email: string;
  telefono?: string;
  password?: string;
  role: number;
  clinica?: number | null;
  is_active: boolean;
}
