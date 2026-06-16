import type { Appointment } from "./appointment";
import type { AppointmentModality } from "./appointment";
import type { Invoice, Payment } from "./billing";
import type { MedicalOrder, Prescription } from "./prescription";

export interface PatientPortalPermissions {
  can_view_medical_record: boolean;
  can_view_prescriptions: boolean;
  can_view_invoices: boolean;
  can_request_appointments: boolean;
  can_cancel_appointments: boolean;
}

export interface PatientPortalProfile {
  id: number;
  codigo_paciente: string;
  nombre_completo: string;
  identidad: string;
  telefono: string;
  correo: string;
  direccion: string;
  ciudad: string;
  departamento: string;
  contacto_emergencia_nombre: string;
  contacto_emergencia_telefono: string;
  contacto_emergencia_parentesco: string;
  alergias?: string;
  enfermedades_cronicas?: string;
}

export interface PatientClinicInfo {
  id: number;
  nombre: string;
  telefono: string;
  correo: string;
  direccion: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  currency: string;
  language: string;
  business_start_time: string;
  business_end_time: string;
  working_days: string[];
  allow_online_appointments: boolean;
  allow_patient_cancellations: boolean;
  terms_and_conditions: string;
  privacy_policy: string;
}

export interface PatientPortalDashboard {
  patient: PatientPortalProfile;
  upcoming_appointments: Appointment[];
  recent_prescriptions: Prescription[];
  pending_invoices: Invoice[];
  unread_notifications: number;
  clinic: PatientClinicInfo;
  permissions: PatientPortalPermissions;
}

export interface PatientAppointmentRequestPayload {
  doctor: number | string;
  scheduled_date: string;
  start_time: string;
  reason: string;
  modality: AppointmentModality;
  notes?: string;
}

export interface PatientMedicalRecordSummary {
  record_number: string;
  blood_type: string;
  allergies: string;
  chronic_diseases: string;
  surgical_history: string;
  family_history: string;
  current_medications: string;
  consultations: Array<Record<string, unknown>>;
  diagnoses: Array<Record<string, unknown>>;
  prescriptions: Array<Record<string, unknown>>;
  medical_orders: Array<Record<string, unknown>>;
}

export type PatientPortalInvoice = Invoice;
export type PatientPortalPayment = Payment;
