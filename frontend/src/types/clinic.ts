export interface Clinic {
  id: number;
  nombre: string;
  rtn: string;
  telefono: string;
  correo: string;
  direccion: string;
  activo: boolean;
  plan?: string | null;
  subscription_status?: string | null;
  subscription_end_date?: string | null;
  users_count?: number;
  doctors_count?: number;
  patients_count?: number;
  creado_en?: string;
  actualizado_en?: string;
}

export type ClinicPayload = Omit<Clinic, "id" | "plan" | "subscription_status" | "subscription_end_date" | "users_count" | "doctors_count" | "patients_count" | "creado_en" | "actualizado_en">;
