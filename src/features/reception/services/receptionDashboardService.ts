import { getTodayAdmissions, getTodayReceptionStats } from '@/features/reception/services/receptionAdmissionService';
import { getTodayAppointments } from '@/features/reception/services/receptionAppointmentService';
import type { ReceptionStats } from '@/features/reception/types/receptionAdmission.types';

export async function getReceptionDashboard(): Promise<ReceptionStats> {
  try {
    return await getTodayReceptionStats();
  } catch {
    const [admissions, appointments] = await Promise.all([
      getTodayAdmissions().catch(() => []),
      getTodayAppointments().catch(() => []),
    ]);
    return {
      registered_today: admissions.length,
      today_admissions: admissions.length,
      today_appointments: appointments.length,
      waiting_triage: admissions.filter((item) => item.status === 'waiting_triage').length,
      waiting_doctor: admissions.filter((item) => item.status === 'waiting_doctor').length,
      in_triage: admissions.filter((item) => item.status === 'in_triage').length,
      in_consultation: admissions.filter((item) => item.status === 'in_consultation').length,
      completed: admissions.filter((item) => item.status === 'completed').length,
      cancelled: admissions.filter((item) => item.status === 'cancelled').length,
    };
  }
}
