export type DoctorAppointment = {
  id: number;
  patient_id?: number;
  patient_name?: string;
  paciente_nombre?: string;
  scheduled_date?: string;
  fecha?: string;
  start_time?: string;
  hora_inicio?: string;
  end_time?: string;
  hora_fin?: string;
  reason?: string;
  motivo?: string;
  status?: string;
  estado?: string;
  visit_id?: number | null;
  visita_id?: number | null;
};

export type DoctorScheduleFilter = 'all' | 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
