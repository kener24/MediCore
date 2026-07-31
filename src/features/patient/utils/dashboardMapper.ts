import type {
  NormalizedPatientDashboard,
  PatientDashboardResponse,
} from '@/features/patient/types/patientDashboard.types';

export function normalizePatientDashboard(
  payload: PatientDashboardResponse,
): NormalizedPatientDashboard {
  const upcomingAppointments = payload.upcoming_appointments ?? [];
  const recentPrescriptions = payload.recent_prescriptions ?? [];
  const pendingInvoices = payload.pending_invoices ?? [];
  const recentDocuments = payload.recent_documents ?? [];
  const recentNotifications = payload.notifications ?? [];

  return {
    clinicName: payload.clinic?.nombre ?? payload.clinic?.name,
    currency: payload.clinic?.currency ?? 'HNL',
    documentsCount: payload.stats?.recent_documents ?? payload.new_documents_count ?? recentDocuments.length,
    lastPayment: payload.last_payment ?? null,
    nextAppointment: payload.next_appointment ?? upcomingAppointments[0] ?? null,
    patientCode: payload.patient?.codigo_paciente ?? payload.patient?.code,
    patientName: payload.patient?.nombre_completo ?? payload.patient?.full_name,
    pendingBalance: payload.pending_balance ?? pendingInvoices.reduce((total, invoice) => total + Number(invoice.balance_due ?? 0), 0),
    pendingInvoices,
    permissions: payload.permissions ?? payload.available_actions ?? {},
    recentDocuments,
    recentNotifications,
    recentPrescriptions,
    stats: {
      activePrescriptions: payload.stats?.active_prescriptions ?? recentPrescriptions.length,
      pendingInvoices: payload.stats?.pending_invoices ?? payload.pending_invoices_count ?? pendingInvoices.length,
      recentDocuments: payload.stats?.recent_documents ?? payload.new_documents_count ?? recentDocuments.length,
      unreadNotifications:
        payload.stats?.unread_notifications ??
        payload.unread_notifications ??
        payload.unread_notifications_count ??
        0,
      upcomingAppointments:
        payload.stats?.upcoming_appointments ?? upcomingAppointments.length,
    },
  };
}
