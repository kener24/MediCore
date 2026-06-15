import type { DoctorPatientSummary, DoctorVitalSigns } from '@/features/doctor/types/doctorConsultation.types';

export type PatientPriority = 'normal' | 'priority' | 'urgent' | 'emergency' | string;

export type WaitingRoomPatient = {
  id: number;
  visit_id?: number;
  visita_id?: number;
  patient_id?: number;
  paciente_id?: number;
  patient_name?: string;
  paciente_nombre?: string;
  patient?: DoctorPatientSummary;
  age?: number | string;
  edad?: number | string;
  gender?: string;
  genero?: string;
  visit_type?: string;
  tipo_visita?: string;
  priority?: string;
  prioridad?: string;
  status?: string;
  estado?: string;
  reason?: string;
  motivo?: string;
  arrived_at?: string;
  llegada_en?: string;
  waiting_time_minutes?: number;
  triage_completed?: boolean;
  triaje_completado?: boolean;
  vital_signs?: DoctorVitalSigns | null;
};
