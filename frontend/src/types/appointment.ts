export type AppointmentStatus = "pendiente" | "confirmada" | "cancelada" | "atendida" | "no_asistio" | "reprogramada";

export interface Appointment {
  id: number;
  clinic: number;
  clinic_nombre?: string;
  patient: number;
  patient_name?: string;
  patient_code?: string;
  doctor: number;
  doctor_name?: string;
  doctor_specialty?: string;
  created_by?: number | null;
  created_by_name?: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  reason: string;
  notes: string;
  status: AppointmentStatus;
  status_display?: string;
  cancellation_reason?: string;
  cancelled_by?: number | null;
  cancelled_by_name?: string;
  cancelled_at?: string | null;
  confirmed_at?: string | null;
  attended_at?: string | null;
  activo: boolean;
  creado_en?: string;
  actualizado_en?: string;
}

export interface AppointmentFilters {
  date?: string;
  date_from?: string;
  date_to?: string;
  doctor?: string;
  patient?: string;
  status?: string;
  is_active?: string;
  search?: string;
  ordering?: string;
  clinic?: string;
}

export interface AppointmentPayload {
  patient: number | string;
  doctor: number | string;
  scheduled_date: string;
  start_time: string;
  end_time?: string;
  reason: string;
  notes?: string;
  status?: AppointmentStatus;
}

export interface AppointmentStats {
  total_appointments: number;
  pending: number;
  confirmed: number;
  cancelled: number;
  attended: number;
  no_show: number;
  today: number;
  upcoming: number;
}

export interface AvailabilitySlot {
  start_time: string;
  end_time: string;
}

export interface AppointmentAvailability {
  doctor: number;
  date: string;
  available_slots: AvailabilitySlot[];
  booked_slots: AvailabilitySlot[];
}
