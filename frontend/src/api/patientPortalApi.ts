import api from "./axios";
import type { Appointment, AppointmentAvailability } from "../types/appointment";
import type { MedicalOrder, Prescription } from "../types/prescription";
import type { PatientAppointmentRequestPayload, PatientClinicInfo, PatientMedicalRecordSummary, PatientPortalCreditNote, PatientPortalDashboard, PatientPortalInvoice, PatientPortalNotification, PatientPortalPayment, PatientPortalProfile } from "../types/patientPortal";

export async function getPatientPortalDashboard() { const { data } = await api.get<PatientPortalDashboard>("/patient-portal/dashboard/"); return data; }
export async function getPatientPortalProfile() { const { data } = await api.get<PatientPortalProfile>("/patient-portal/profile/"); return data; }
export async function updatePatientPortalProfile(payload: Partial<PatientPortalProfile>) { const { data } = await api.patch<PatientPortalProfile>("/patient-portal/profile/", payload); return data; }
export async function getPatientPortalAppointments(filters?: Record<string, string>) { const { data } = await api.get<Appointment[]>("/patient-portal/appointments/", { params: filters }); return data; }
export async function getPatientPortalAppointment(id: number | string) { const { data } = await api.get<Appointment>(`/patient-portal/appointments/${id}/`); return data; }
export async function requestPatientAppointment(payload: PatientAppointmentRequestPayload, idempotencyKey = crypto.randomUUID()) { const { data } = await api.post<Appointment>("/patient-portal/appointments/request/", payload, { headers: { "Idempotency-Key": idempotencyKey } }); return data; }
export async function reschedulePatientAppointment(id: number | string, payload: { scheduled_date: string; start_time: string; reason: string }, idempotencyKey = crypto.randomUUID()) { const { data } = await api.post<Appointment>(`/patient-portal/appointments/${id}/reschedule/`, payload, { headers: { "Idempotency-Key": idempotencyKey } }); return data; }
export async function cancelPatientAppointment(id: number | string, reason: string) { const { data } = await api.patch<Appointment>(`/patient-portal/appointments/${id}/cancel/`, { reason }); return data; }
export async function getPatientPortalDoctors(filters?: Record<string, string>) { const { data } = await api.get<Array<Record<string, unknown>>>("/patient-portal/doctors/", { params: filters }); return data; }
export async function getPatientPortalSpecialties() { const { data } = await api.get<Array<Record<string, unknown>>>("/patient-portal/specialties/"); return data; }
export async function getPatientDoctorAvailability(doctorId: number | string, date: string, modality = "presencial") { const { data } = await api.get<AppointmentAvailability>(`/patient-portal/doctors/${doctorId}/availability/`, { params: { date, modality } }); return data; }
export async function getPatientPortalPrescriptions() { const { data } = await api.get<Prescription[]>("/patient-portal/prescriptions/"); return data; }
export async function getPatientPortalPrescription(id: number | string) { const { data } = await api.get<Prescription>(`/patient-portal/prescriptions/${id}/`); return data; }
export async function getPatientPortalPrescriptionPdf(id: number | string) { const { data } = await api.get<Blob>(`/patient-portal/prescriptions/${id}/pdf/`, { responseType: "blob" }); return data; }
export async function getPatientPortalMedicalOrders() { const { data } = await api.get<MedicalOrder[]>("/patient-portal/medical-orders/"); return data; }
export async function getPatientPortalMedicalOrder(id: number | string) { const { data } = await api.get<MedicalOrder>(`/patient-portal/medical-orders/${id}/`); return data; }
export async function getPatientPortalInvoices() { const { data } = await api.get<PatientPortalInvoice[]>("/patient-portal/invoices/"); return data; }
export async function getPatientPortalInvoice(id: number | string) { const { data } = await api.get<PatientPortalInvoice>(`/patient-portal/invoices/${id}/`); return data; }
export async function getPatientPortalInvoicePdf(id: number | string) { const { data } = await api.get<Blob>(`/patient-portal/invoices/${id}/pdf/`, { responseType: "blob" }); return data; }
export async function getPatientPortalPayments() { const { data } = await api.get<PatientPortalPayment[]>("/patient-portal/payments/"); return data; }
export async function getPatientPortalPayment(id: number | string) { const { data } = await api.get<PatientPortalPayment>(`/patient-portal/payments/${id}/`); return data; }
export async function getPatientPortalPaymentReceipt(id: number | string) { const { data } = await api.get<Blob>(`/patient-portal/payments/${id}/receipt/`, { responseType: "blob" }); return data; }
export async function getPatientPortalCreditNotes() { const { data } = await api.get<PatientPortalCreditNote[]>("/patient-portal/credit-notes/"); return data; }
export async function getPatientPortalCreditNote(id: number | string) { const { data } = await api.get<PatientPortalCreditNote>(`/patient-portal/credit-notes/${id}/`); return data; }
export async function getPatientPortalCreditNotePdf(id: number | string) { const { data } = await api.get<Blob>(`/patient-portal/credit-notes/${id}/pdf/`, { responseType: "blob" }); return data; }
export async function getPatientMedicalRecordSummary() { const { data } = await api.get<PatientMedicalRecordSummary>("/patient-portal/medical-record-summary/"); return data; }
export async function getPatientPortalNotifications(status?: "unread" | "read") { const { data } = await api.get<PatientPortalNotification[]>("/patient-portal/notifications/", { params: status ? { status } : undefined }); return data; }
export async function getPatientPortalNotification(id: number | string) { const items = await getPatientPortalNotifications(); const item = items.find((notification) => String(notification.id) === String(id)); if (!item) throw new Error("Notificación no encontrada."); return item; }
export async function markPatientPortalNotificationRead(id: number | string) { const { data } = await api.patch<PatientPortalNotification>(`/patient-portal/notifications/${id}/mark-read/`); return data; }
export async function markAllPatientPortalNotificationsRead() { const { data } = await api.patch<{ updated: number }>("/patient-portal/notifications/mark-all-read/"); return data; }
export async function getPatientPortalUnreadCount() { const { data } = await api.get<{ unread_count: number }>("/patient-portal/notifications/unread-count/"); return data; }
export async function getPatientPortalClinicInfo() { const { data } = await api.get<PatientClinicInfo>("/patient-portal/clinic-info/"); return data; }
export async function getPatientPortalSettings() { const { data } = await api.get("/patient-portal/settings/"); return data; }
