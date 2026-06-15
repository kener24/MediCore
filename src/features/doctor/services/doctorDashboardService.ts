import { endpoints } from '@/core/api/endpoints';
import { getDoctorProfile } from '@/features/doctor/services/doctorProfileService';
import { getDoctorAppointments } from '@/features/doctor/services/doctorScheduleService';
import { getDoctorWaitingRoom } from '@/features/doctor/services/doctorWaitingRoomService';
import { getDoctorUnreadNotificationsCount } from '@/features/doctor/services/doctorNotificationsService';
import { getFirstAvailable } from '@/features/doctor/services/doctorApiHelpers';
import type {
  DoctorDashboardResponse,
  NormalizedDoctorDashboard,
} from '@/features/doctor/types/doctorDashboard.types';

function normalizeDashboard(payload: DoctorDashboardResponse): NormalizedDoctorDashboard {
  const doctor = payload.doctor ?? {};
  const stats = payload.stats ?? {};
  return {
    clinicName: doctor.clinic_name ?? doctor.clinica_nombre,
    doctorName: doctor.full_name ?? doctor.nombre_completo,
    recentConsultations: payload.recent_consultations ?? [],
    specialty: doctor.specialty_name ?? doctor.especialidad_nombre,
    stats: {
      completedConsultations: stats.completed_consultations ?? 0,
      pendingConsultations: stats.pending_consultations ?? 0,
      todayAppointments: stats.today_appointments ?? 0,
      unreadNotifications: stats.unread_notifications ?? 0,
      waitingPatients: stats.waiting_patients ?? 0,
    },
    todayAppointments: payload.today_appointments ?? [],
    waitingRoom: payload.waiting_room ?? [],
  };
}

export async function getDoctorDashboard() {
  try {
    const data = await getFirstAvailable<DoctorDashboardResponse>([
      endpoints.doctor.dashboard,
      endpoints.doctor.dashboardAlt,
    ]);
    return normalizeDashboard(data);
  } catch {
    const [profile, appointments, waitingRoom, unread] = await Promise.all([
      getDoctorProfile(),
      getDoctorAppointments(),
      getDoctorWaitingRoom().catch(() => []),
      getDoctorUnreadNotificationsCount().catch(() => 0),
    ]);
    return {
      clinicName: profile.clinic_name ?? profile.clinica_nombre,
      doctorName: profile.full_name ?? profile.nombre_completo,
      recentConsultations: [],
      specialty: profile.specialty_name ?? profile.especialidad_nombre,
      stats: {
        completedConsultations: 0,
        pendingConsultations: waitingRoom.length,
        todayAppointments: appointments.length,
        unreadNotifications: unread,
        waitingPatients: waitingRoom.length,
      },
      todayAppointments: appointments,
      waitingRoom,
    } satisfies NormalizedDoctorDashboard;
  }
}
