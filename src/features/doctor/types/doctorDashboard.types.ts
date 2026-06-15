import type { DoctorAppointment } from '@/features/doctor/types/doctorSchedule.types';
import type { WaitingRoomPatient } from '@/features/doctor/types/doctorWaitingRoom.types';
import type { DoctorConsultationSummary } from '@/features/doctor/types/doctorConsultation.types';

export type DoctorDashboardResponse = {
  doctor?: {
    id?: number;
    full_name?: string;
    nombre_completo?: string;
    specialty_name?: string;
    especialidad_nombre?: string;
    clinic_name?: string;
    clinica_nombre?: string;
  };
  stats?: {
    today_appointments?: number;
    waiting_patients?: number;
    completed_consultations?: number;
    pending_consultations?: number;
    unread_notifications?: number;
  };
  today_appointments?: DoctorAppointment[];
  waiting_room?: WaitingRoomPatient[];
  recent_consultations?: DoctorConsultationSummary[];
};

export type NormalizedDoctorDashboard = {
  doctorName?: string;
  specialty?: string;
  clinicName?: string;
  stats: {
    todayAppointments: number;
    waitingPatients: number;
    completedConsultations: number;
    pendingConsultations: number;
    unreadNotifications: number;
  };
  todayAppointments: DoctorAppointment[];
  waitingRoom: WaitingRoomPatient[];
  recentConsultations: DoctorConsultationSummary[];
};
