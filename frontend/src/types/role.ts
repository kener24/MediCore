export type RoleName = "superadmin" | "admin" | "medico" | "enfermera" | "recepcionista" | "paciente";

export interface Role {
  id: number;
  nombre: RoleName | string;
  descripcion: string;
  activo: boolean;
  permissions?: string[];
  permission_groups?: Record<string, string[]>;
  creado_en?: string;
  actualizado_en?: string;
}
