export interface MedicalSpecialty {
  id: number;
  nombre: string;
  descripcion: string;
  activo: boolean;
}

export interface DoctorProfile {
  id: number;
  clinic: number;
  clinic_nombre?: string;
  user: number;
  user_nombre?: string;
  user_email?: string;
  user_telefono?: string;
  specialty: number;
  specialty_nombre?: string;
  numero_colegiacion: string;
  titulo_profesional: string;
  biografia: string;
  tarifa_consulta: string;
  duracion_consulta_minutos: number;
  atiende_virtual: boolean;
  atiende_presencial: boolean;
  activo: boolean;
  creado_en?: string;
  actualizado_en?: string;
  schedules?: DoctorSchedule[];
}

export interface DoctorSchedule {
  id: number;
  doctor: number;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
  activo: boolean;
}

export interface DoctorDashboard {
  doctor: null | {
    id: number;
    nombre_completo: string;
    email: string;
    specialty: string;
    numero_colegiacion: string;
    activo: boolean;
  };
  schedules: DoctorSchedule[];
}

export interface DoctorPayload {
  user?: number;
  specialty: number;
  numero_colegiacion: string;
  titulo_profesional?: string;
  biografia?: string;
  tarifa_consulta: string;
  duracion_consulta_minutos: number;
  atiende_virtual: boolean;
  atiende_presencial: boolean;
  activo: boolean;
}

export type DoctorSchedulePayload = Omit<DoctorSchedule, "id" | "doctor">;

