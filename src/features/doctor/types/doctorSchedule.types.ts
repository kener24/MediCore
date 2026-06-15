export type DoctorAppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'checked_in'
  | 'waiting'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | string;

export type DoctorAppointment = {
  id: number;
  appointment_id?: number;
  patient_id?: number;
  patient_name?: string;
  paciente_nombre?: string;
  patient_age?: number | string;
  patient_gender?: string;
  scheduled_date?: string;
  fecha?: string;
  start_time?: string;
  hora_inicio?: string;
  end_time?: string;
  hora_fin?: string;
  reason?: string;
  motivo?: string;
  status?: DoctorAppointmentStatus;
  estado?: string;
  visit_id?: number | null;
  visita_id?: number | null;
  specialty_name?: string;
  clinic_name?: string;
};

export type DoctorScheduleFilter = 'all' | 'scheduled' | 'confirmed' | 'waiting' | 'completed' | 'cancelled';
