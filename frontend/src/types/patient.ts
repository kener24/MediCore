export interface Patient {
  id: number;
  clinic: number;
  clinic_nombre?: string;
  user: number | null;
  codigo_paciente: string;
  nombres: string;
  apellidos: string;
  nombre_completo: string;
  identidad: string;
  fecha_nacimiento: string | null;
  genero: string;
  tipo_sangre: string;
  telefono: string;
  correo: string;
  direccion: string;
  ciudad: string;
  departamento: string;
  pais: string;
  contacto_emergencia_nombre: string;
  contacto_emergencia_telefono: string;
  contacto_emergencia_parentesco: string;
  alergias: string;
  enfermedades_cronicas: string;
  observaciones: string;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
}

export interface PatientFilters {
  search?: string;
  is_active?: string;
  gender?: string;
  blood_type?: string;
  clinic?: string;
  age_min?: string;
  age_max?: string;
}

export interface PatientStats {
  total_patients: number;
  active_patients: number;
  inactive_patients: number;
  male_patients: number;
  female_patients: number;
  other_patients: number;
}

export type PatientPayload = Partial<Omit<Patient, "id" | "clinic_nombre" | "nombre_completo" | "creado_en" | "actualizado_en">>;

