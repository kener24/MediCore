export type DoctorClinicInfo = {
  address?: string;
  correo?: string;
  direccion?: string;
  email?: string;
  id?: number;
  name?: string;
  nombre?: string;
  phone?: string;
  telefono?: string;
};

export type DoctorProfessionalInfo = {
  biography?: string;
  biografia?: string;
  consultation_duration_minutes?: number | string;
  consultation_fee?: number | string;
  duracion_consulta?: number | string;
  especialidad?: string;
  id?: number;
  license_number?: string;
  numero_colegiacion?: string;
  professional_code?: string;
  specialty?: string;
  sub_specialty?: string;
  subespecialidad?: string;
  tarifa_consulta?: number | string;
};

export type DoctorScheduleItem = {
  day_label?: string;
  day_of_week?: string;
  dia?: string;
  end_time?: string;
  hora_fin?: string;
  hora_inicio?: string;
  id?: number;
  is_active?: boolean;
  start_time?: string;
};

export type DoctorActivitySummary = {
  completed_consultations?: number;
  consultas_finalizadas?: number;
  consultas_hoy?: number;
  patients_attended?: number;
  pacientes_atendidos?: number;
  prescriptions_issued?: number;
  recetas_emitidas?: number;
  today_consultations?: number;
};

export type DoctorProfile = {
  avatar_url?: string | null;
  clinic?: DoctorClinicInfo | number | null;
  clinic_name?: string;
  clinica?: DoctorClinicInfo | number | null;
  clinica_nombre?: string;
  created_at?: string;
  email?: string;
  especialidad_nombre?: string;
  first_name?: string;
  full_name?: string;
  id?: number;
  is_active?: boolean;
  last_login?: string | null;
  last_name?: string;
  nombre_completo?: string;
  phone?: string;
  professional?: DoctorProfessionalInfo | null;
  role?: { nombre?: string } | number | string;
  role_nombre?: string;
  schedules?: DoctorScheduleItem[];
  specialty_name?: string;
  telefono?: string;
  user_id?: number;
};

export type DoctorProfileUpdatePayload = {
  biography?: string;
  biografia?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  telefono?: string;
};

export type ChangePasswordPayload = {
  confirm_password: string;
  current_password: string;
  new_password: string;
};
