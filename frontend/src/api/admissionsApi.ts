import api from "./axios";
import type { PatientVisit, AdmissionStats } from "../types/admission";
import type { VitalSigns, VitalSignsPayload } from "../types/medicalRecord";
import type { Invoice } from "../types/billing";

export async function getVisits(filters?: Record<string, string>) { const { data } = await api.get<PatientVisit[]>("/admissions/visits/", { params: filters }); return data; }
export async function getVisit(id: number | string) { const { data } = await api.get<PatientVisit>(`/admissions/visits/${id}/`); return data; }
export async function createVisit(payload: Record<string, unknown>) { const { data } = await api.post<PatientVisit>("/admissions/visits/", payload); return data; }
export async function registerWalkIn(payload: Record<string, unknown>) { const { data } = await api.post<PatientVisit>("/admissions/register-walk-in/", payload); return data; }
export async function checkInAppointment(payload: Record<string, unknown>) { const { data } = await api.post<PatientVisit>("/admissions/check-in-appointment/", payload); return data; }
export async function getTriageQueue(filters?: Record<string, string>) { const { data } = await api.get<PatientVisit[]>("/admissions/triage-queue/", { params: filters }); return data; }
export async function startTriage(id: number | string) { const { data } = await api.patch<PatientVisit>(`/admissions/visits/${id}/start-triage/`); return data; }
export async function completeTriage(id: number | string) { const { data } = await api.patch<PatientVisit>(`/admissions/visits/${id}/complete-triage/`); return data; }
export async function sendVisitToTriage(id: number | string) { const { data } = await api.patch<PatientVisit>(`/reception/visits/${id}/send-to-triage/`); return data; }
export async function sendVisitToDoctor(id: number | string) { const { data } = await api.patch<PatientVisit>(`/reception/visits/${id}/send-to-doctor/`); return data; }
export async function cancelReceptionVisit(id: number | string, reason: string) { const { data } = await api.patch<PatientVisit>(`/reception/visits/${id}/cancel/`, { reason }); return data; }
export async function getVisitVitalSigns(id: number | string) { const { data } = await api.get<VitalSigns[]>(`/admissions/visits/${id}/vital-signs/`); return data; }
export async function createVisitVitalSigns(id: number | string, payload: VitalSignsPayload & { pain_scale?: number }) { const { data } = await api.post<VitalSigns>(`/admissions/visits/${id}/vital-signs/`, payload); return data; }
export async function getDoctorWaitingRoom(filters?: Record<string, string>) { const { data } = await api.get<PatientVisit[]>("/admissions/doctor-waiting-room/", { params: filters }); return data; }
export async function startVisitConsultation(id: number | string) { const { data } = await api.patch<{ visit: PatientVisit; consultation: number }>(`/admissions/visits/${id}/start-consultation/`); return data; }
export async function completeVisitConsultation(id: number | string) { const { data } = await api.patch<PatientVisit>(`/admissions/visits/${id}/complete-consultation/`); return data; }
export async function getAdmissionStatsToday() { const { data } = await api.get<AdmissionStats>("/admissions/stats/today/"); return data; }
export async function getPendingBillingVisits(filters?: Record<string, string>) { const { data } = await api.get<PatientVisit[]>("/billing/pending-visits/", { params: filters }); return data; }
export async function generateInvoiceFromVisit(id: number | string) { const { data } = await api.post<Invoice>(`/billing/visits/${id}/generate-invoice/`); return data; }
