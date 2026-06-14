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
