import type { PatientAppointment } from '@/features/patient/types/patientAppointments.types';
import type { PatientDocument } from '@/features/patient/types/patientDocuments.types';
import type { PatientInvoice } from '@/features/patient/types/patientInvoices.types';
import type { PatientNotification } from '@/features/patient/types/patientNotifications.types';
import type { PatientPayment } from '@/features/patient/types/patientPayments.types';
import type { PatientPrescription } from '@/features/patient/types/patientPrescriptions.types';
import type { PatientProfile } from '@/features/patient/types/patientProfile.types';

export type PatientPortalPermissions = {
  can_view_medical_record?: boolean;
  can_view_prescriptions?: boolean;
  can_view_invoices?: boolean;
  can_view_payments?: boolean;
  can_view_credit_notes?: boolean;
  can_download_invoice_pdf?: boolean;
  can_download_receipts?: boolean;
  can_view_medical_orders?: boolean;
  can_view_documents?: boolean;
  can_request_appointments?: boolean;
  can_request_in_person_appointments?: boolean;
  can_request_online_appointments?: boolean;
  can_reschedule_appointments?: boolean;
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
  pending_invoices_count?: number;
  pending_balance?: string | number;
  last_payment?: PatientPayment | null;
  recent_documents?: PatientDocument[];
  notifications?: PatientNotification[];
  unread_notifications?: number;
  new_documents_count?: number;
  unread_notifications_count?: number;
  clinic?: PatientClinicInfo;
  permissions?: PatientPortalPermissions;
  available_actions?: PatientPortalPermissions;
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
  lastPayment: PatientPayment | null;
  patientCode?: string;
  patientName?: string;
  pendingBalance: string | number;
  pendingInvoices: PatientInvoice[];
  permissions: PatientPortalPermissions;
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
