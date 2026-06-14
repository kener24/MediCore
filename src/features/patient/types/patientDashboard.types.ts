import type { PatientAppointment } from '@/features/patient/types/patientAppointments.types';
import type { PatientDocument } from '@/features/patient/types/patientDocuments.types';
import type { PatientInvoice } from '@/features/patient/types/patientInvoices.types';
import type { PatientNotification } from '@/features/patient/types/patientNotifications.types';
import type { PatientPrescription } from '@/features/patient/types/patientPrescriptions.types';
import type { PatientProfile } from '@/features/patient/types/patientProfile.types';

export type PatientPortalPermissions = {
  can_view_medical_record?: boolean;
  can_view_prescriptions?: boolean;
  can_view_invoices?: boolean;
  can_request_appointments?: boolean;
  can_cancel_appointments?: boolean;
};

export type PatientClinicInfo = {
  id?: number;
  nombre?: string;
  telefono?: string;
  correo?: string;
  direccion?: string;
  currency?: string;
  allow_online_appointments?: boolean;
  allow_patient_cancellations?: boolean;
};

export type PatientDashboard = {
  patient?: PatientProfile;
  upcoming_appointments?: PatientAppointment[];
  next_appointment?: PatientAppointment | null;
  recent_prescriptions?: PatientPrescription[];
  pending_invoices?: PatientInvoice[];
  recent_documents?: PatientDocument[];
  notifications?: PatientNotification[];
  unread_notifications?: number;
  unread_notifications_count?: number;
  clinic?: PatientClinicInfo;
  permissions?: PatientPortalPermissions;
};

export type PatientDashboardResponse = PatientDashboard & {
  patient?: PatientProfile & {
    full_name?: string;
    code?: string;
    email?: string;
    phone?: string;
  };
  clinic?: PatientClinicInfo & {
    name?: string;
    logo_url?: string | null;
    primary_color?: string | null;
  };
  stats?: {
    upcoming_appointments?: number;
    pending_invoices?: number;
    unread_notifications?: number;
    recent_documents?: number;
    active_prescriptions?: number;
  };
};

export type NormalizedPatientDashboard = {
  clinicName?: string;
  currency: string;
  documentsCount: number;
  nextAppointment: PatientAppointment | null;
  patientCode?: string;
  patientName?: string;
  pendingInvoices: PatientInvoice[];
  recentDocuments: PatientDocument[];
  recentNotifications: PatientNotification[];
  recentPrescriptions: PatientPrescription[];
  stats: {
    activePrescriptions: number;
    pendingInvoices: number;
    recentDocuments: number;
    unreadNotifications: number;
    upcomingAppointments: number;
  };
};
