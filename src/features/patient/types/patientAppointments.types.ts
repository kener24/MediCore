export type PatientAppointmentStatus =
  | 'pendiente'
  | 'confirmada'
  | 'cancelada'
  | 'atendida'
  | 'no_asistio'
  | 'reprogramada'
  | string;

export type PatientAppointment = {
  id: number;
  clinic?: number;
  clinic_nombre?: string;
  patient?: number;
  patient_name?: string;
  patient_code?: string;
  doctor?: number;
  doctor_name?: string;
  doctor_nombre?: string;
  doctor_specialty?: string;
  specialty_name?: string;
  scheduled_date?: string;
  start_time?: string;
  end_time?: string;
  reason?: string;
  notes?: string;
  status?: PatientAppointmentStatus;
  status_display?: string;
  cancellation_reason?: string;
  can_cancel?: boolean;
  activo?: boolean;
  creado_en?: string;
  actualizado_en?: string;
};

export type PatientAppointmentFilter = 'upcoming' | 'history' | 'all';

export type AppointmentAvailabilitySlot = {
  start_time: string;
  end_time?: string;
};

export type AppointmentAvailability = {
  doctor?: number;
  date?: string;
  available_slots?: AppointmentAvailabilitySlot[];
  booked_slots?: AppointmentAvailabilitySlot[];
  allow_online_appointments?: boolean;
  message?: string;
};

export type PatientSpecialty = {
  id: number;
  name?: string;
  nombre?: string;
  description?: string;
  descripcion?: string;
};

export type PatientDoctor = {
  id: number;
  user?: number;
  name?: string;
  nombre?: string;
  full_name?: string;
  nombre_completo?: string;
  specialty?: number | string;
  specialty_name?: string;
  especialidad_nombre?: string;
};

export type PatientAppointmentRequestPayload = {
  doctor: number | string;
  scheduled_date: string;
  start_time: string;
  reason: string;
  notes?: string;
};
