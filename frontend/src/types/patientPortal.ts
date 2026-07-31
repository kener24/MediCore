import type { Appointment } from "./appointment";
import type { AppointmentModality } from "./appointment";
import type { MedicalOrder, Prescription } from "./prescription";

export interface PatientPortalPermissions {
  can_view_medical_record: boolean;
  can_view_prescriptions: boolean;
  can_view_invoices: boolean;
  can_view_payments: boolean;
  can_view_credit_notes: boolean;
  can_download_invoice_pdf: boolean;
  can_download_receipts: boolean;
  can_view_medical_orders: boolean;
  can_view_documents: boolean;
  can_request_appointments: boolean;
  can_request_in_person_appointments: boolean;
  can_request_online_appointments: boolean;
  can_reschedule_appointments: boolean;
  can_cancel_appointments: boolean;
}

export interface PatientPortalProfile {
  id: number;
  codigo_paciente: string;
  nombre_completo: string;
  identidad: string;
  fecha_nacimiento?: string | null;
  genero?: string;
  tipo_sangre?: string;
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
  recent_orders: MedicalOrder[];
  pending_invoices: PatientPortalInvoice[];
  pending_invoices_count: number;
  pending_balance: string;
  last_payment: PatientPortalPayment | null;
  new_documents_count: number;
  unread_notifications: number;
  clinic: PatientClinicInfo;
  permissions: PatientPortalPermissions;
  available_actions: PatientPortalPermissions;
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

export interface PatientPortalInvoiceItem {
  id: number;
  description: string;
  quantity: string;
  unit_price: string;
  discount_amount: string;
  tax_type: string;
  tax_type_display: string;
  tax_rate: string;
  subtotal: string;
  tax_amount: string;
  line_total: string;
}

export interface PatientPortalPayment {
  id: number;
  clinic_nombre: string;
  invoice: number;
  invoice_number: string;
  payment_number: string;
  payment_date: string;
  amount: string;
  method: string;
  method_display: string;
  reference_visible: string;
  notes: string;
  status: "aplicado" | "anulado";
  status_display: string;
  balance_before: string;
  balance_after: string;
  receipt_available: boolean;
  receipt_url: string;
  creado_en: string;
}

export interface PatientPortalCreditNote {
  id: number;
  clinic_nombre: string;
  original_invoice: number;
  original_invoice_number: string;
  credit_note_number: string;
  fiscal_number: string;
  issue_date: string;
  reason: string;
  subtotal: string;
  discount_amount: string;
  tax_amount: string;
  total_amount: string;
  status: string;
  status_display: string;
  pdf_url: string;
}

export interface PatientPortalInvoice {
  id: number;
  clinic_nombre: string;
  invoice_number: string;
  issue_date: string;
  due_date: string | null;
  status: "borrador" | "pendiente" | "parcialmente_pagada" | "pagada" | "anulada";
  status_display: string;
  is_fiscal: boolean;
  fiscal_status: "draft" | "issued" | "cancelled" | "void";
  fiscal_status_display: string;
  fiscal_number: string | null;
  subtotal: string;
  discount_amount: string;
  tax_amount: string;
  total_amount: string;
  subtotal_exempt: string;
  subtotal_exonerated: string;
  subtotal_taxed_15: string;
  subtotal_taxed_18: string;
  isv_15: string;
  isv_18: string;
  paid_amount: string;
  balance_due: string;
  related_credit_note: PatientPortalCreditNote | null;
  pdf_available: boolean;
  pdf_url: string;
  patient_name?: string;
  customer_name?: string;
  customer_rtn?: string;
  customer_address?: string;
  notes?: string;
  amount_in_words?: string;
  cancellation_reason?: string;
  items?: PatientPortalInvoiceItem[];
  payments?: PatientPortalPayment[];
}

export interface PatientPortalNotificationTarget {
  type: string;
  id: string;
  path: string;
}

export interface PatientPortalNotification {
  id: number;
  title: string;
  message: string;
  notification_type: string;
  notification_type_display: string;
  module: string;
  priority: string;
  priority_display: string;
  status: "unread" | "read" | "archived";
  read_at: string | null;
  sent_at: string | null;
  expires_at: string | null;
  target: PatientPortalNotificationTarget | null;
  creado_en: string;
  actualizado_en: string;
}
