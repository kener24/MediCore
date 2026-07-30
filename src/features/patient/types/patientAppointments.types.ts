export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'checked_in'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'pendiente'
  | 'confirmada'
  | 'cancelada'
  | 'atendida'
  | 'no_asistio'
  | 'reprogramada'
  | string;

export type PatientAppointmentStatus = AppointmentStatus;
export type AppointmentModality = 'presencial' | 'online';

export type PatientAppointment = {
  id: number;
  clinic?: number;
  clinic_name?: string;
  clinic_nombre?: string;
  patient?: number;
  patient_name?: string;
  patient_code?: string;
  doctor?: number;
  doctor_email?: string;
  doctor_name?: string;
  doctor_nombre?: string;
  doctor_phone?: string;
  doctor_specialty?: string;
  specialty?: number;
  specialty_name?: string;
  specialty_nombre?: string;
  scheduled_date?: string;
  start_time?: string;
  end_time?: string;
  modality?: AppointmentModality | string;
  reason?: string;
  notes?: string | null;
  status?: PatientAppointmentStatus;
  status_display?: string;
  cancellation_reason?: string | null;
  can_cancel?: boolean;
  can_reschedule?: boolean;
  duration_minutes?: number | null;
  last_reschedule_reason?: string | null;
  rescheduled_at?: string | null;
  instructions?: string | null;
  activo?: boolean;
  created_at?: string;
  updated_at?: string;
  creado_en?: string;
  actualizado_en?: string;
};

export type PatientAppointmentDetail = PatientAppointment;

export type PatientAppointmentFilter = 'upcoming' | 'history' | 'all';

export type AppointmentAvailabilitySlot = {
  start_time: string;
  end_time?: string;
  available?: boolean;
};

export type AppointmentAvailability = {
  doctor?: number;
  date?: string;
  available_slots?: AppointmentAvailabilitySlot[];
  booked_slots?: AppointmentAvailabilitySlot[];
  allow_online_appointments?: boolean;
  modality?: AppointmentModality | string;
  message?: string;
};

export type PatientSpecialty = {
  id: number;
  name?: string;
  nombre?: string;
  description?: string;
  descripcion?: string;
};

export type Specialty = PatientSpecialty;

export type PatientDoctor = {
  id: number;
  user?: number;
  name?: string;
  nombre?: string;
  full_name?: string;
  nombre_completo?: string;
  user_nombre?: string;
  specialty?: number | string;
  specialty_name?: string;
  especialidad_nombre?: string;
  specialty_nombre?: string;
};

export type Doctor = PatientDoctor;
export type DoctorAvailabilitySlot = AppointmentAvailabilitySlot;

export type PatientAppointmentRequestPayload = {
  doctor: number;
  scheduled_date: string;
  start_time: string;
  reason: string;
  modality: AppointmentModality;
  notes?: string;
};

export type AppointmentRequestPayload = PatientAppointmentRequestPayload;

export type CancelAppointmentPayload = {
  reason: string;
};

export type RescheduleAppointmentPayload = {
  scheduled_date: string;
  start_time: string;
  reason: string;
};
