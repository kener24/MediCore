export type RoleName = "superadmin" | "admin" | "medico" | "enfermera" | "recepcionista" | "paciente";

export interface Role {
  id: number;
  nombre: RoleName | string;
  descripcion: string;
  activo: boolean;
  creado_en?: string;
  actualizado_en?: string;
}
