import api from "./axios";
import type { Appointment, AppointmentAvailability } from "../types/appointment";
import type { Invoice, Payment } from "../types/billing";
import type { MedicalOrder, Prescription } from "../types/prescription";
import type { PatientAppointmentRequestPayload, PatientClinicInfo, PatientMedicalRecordSummary, PatientPortalDashboard, PatientPortalProfile } from "../types/patientPortal";

export async function getPatientPortalDashboard() { const { data } = await api.get<PatientPortalDashboard>("/patient-portal/dashboard/"); return data; }
export async function getPatientPortalProfile() { const { data } = await api.get<PatientPortalProfile>("/patient-portal/profile/"); return data; }
export async function updatePatientPortalProfile(payload: Partial<PatientPortalProfile>) { const { data } = await api.patch<PatientPortalProfile>("/patient-portal/profile/", payload); return data; }
export async function getPatientPortalAppointments(filters?: Record<string, string>) { const { data } = await api.get<Appointment[]>("/patient-portal/appointments/", { params: filters }); return data; }
export async function getPatientPortalAppointment(id: number | string) { const { data } = await api.get<Appointment>(`/patient-portal/appointments/${id}/`); return data; }
export async function requestPatientAppointment(payload: PatientAppointmentRequestPayload) { const { data } = await api.post<Appointment>("/patient-portal/appointments/request/", payload); return data; }
export async function cancelPatientAppointment(id: number | string, reason: string) { const { data } = await api.patch<Appointment>(`/patient-portal/appointments/${id}/cancel/`, { reason }); return data; }
export async function getPatientPortalDoctors(filters?: Record<string, string>) { const { data } = await api.get<Array<Record<string, unknown>>>("/patient-portal/doctors/", { params: filters }); return data; }
export async function getPatientPortalSpecialties() { const { data } = await api.get<Array<Record<string, unknown>>>("/patient-portal/specialties/"); return data; }
export async function getPatientDoctorAvailability(doctorId: number | string, date: string) { const { data } = await api.get<AppointmentAvailability>(`/patient-portal/doctors/${doctorId}/availability/`, { params: { date } }); return data; }
export async function getPatientPortalPrescriptions() { const { data } = await api.get<Prescription[]>("/patient-portal/prescriptions/"); return data; }
export async function getPatientPortalPrescription(id: number | string) { const { data } = await api.get<Prescription>(`/patient-portal/prescriptions/${id}/`); return data; }
export async function getPatientPortalMedicalOrders() { const { data } = await api.get<MedicalOrder[]>("/patient-portal/medical-orders/"); return data; }
export async function getPatientPortalMedicalOrder(id: number | string) { const { data } = await api.get<MedicalOrder>(`/patient-portal/medical-orders/${id}/`); return data; }
export async function getPatientPortalInvoices() { const { data } = await api.get<Invoice[]>("/patient-portal/invoices/"); return data; }
export async function getPatientPortalInvoice(id: number | string) { const { data } = await api.get<Invoice>(`/patient-portal/invoices/${id}/`); return data; }
export async function getPatientPortalPayments() { const { data } = await api.get<Payment[]>("/patient-portal/payments/"); return data; }
export async function getPatientMedicalRecordSummary() { const { data } = await api.get<PatientMedicalRecordSummary>("/patient-portal/medical-record-summary/"); return data; }
export async function getPatientPortalNotifications() { const { data } = await api.get<Array<Record<string, unknown>>>("/patient-portal/notifications/"); return data; }
export async function getPatientPortalUnreadCount() { const { data } = await api.get<{ unread_count: number }>("/patient-portal/notifications/unread-count/"); return data; }
export async function getPatientPortalClinicInfo() { const { data } = await api.get<PatientClinicInfo>("/patient-portal/clinic-info/"); return data; }

