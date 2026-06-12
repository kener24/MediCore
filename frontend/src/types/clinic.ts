export interface Clinic {
  id: number;
  nombre: string;
  rtn: string;
  telefono: string;
  correo: string;
  direccion: string;
  activo: boolean;
  creado_en?: string;
  actualizado_en?: string;
}

export type ClinicPayload = Omit<Clinic, "id" | "creado_en" | "actualizado_en">;
