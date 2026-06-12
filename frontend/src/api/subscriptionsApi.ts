import api from "./axios";
import type { ClinicSubscription, PlanUsage, SubscriptionFeatures, SubscriptionPlan } from "../types/subscription";

export async function getSubscriptionPlans() { const { data } = await api.get<SubscriptionPlan[]>("/subscriptions/plans/"); return data; }
export async function getSubscriptionPlan(id: number | string) { const { data } = await api.get<SubscriptionPlan>(`/subscriptions/plans/${id}/`); return data; }
export async function createSubscriptionPlan(payload: Partial<SubscriptionPlan>) { const { data } = await api.post<SubscriptionPlan>("/subscriptions/plans/", payload); return data; }
export async function updateSubscriptionPlan(id: number | string, payload: Partial<SubscriptionPlan>) { const { data } = await api.patch<SubscriptionPlan>(`/subscriptions/plans/${id}/`, payload); return data; }
export async function deleteSubscriptionPlan(id: number | string) { await api.delete(`/subscriptions/plans/${id}/`); }
export async function getMySubscription() { const { data } = await api.get<ClinicSubscription>("/subscriptions/my-subscription/"); return data; }
export async function getClinicSubscriptions(filters?: Record<string, string>) { const { data } = await api.get<ClinicSubscription[]>("/subscriptions/clinics/", { params: filters }); return data; }
export async function getClinicSubscription(clinicId: number | string) { const { data } = await api.get<ClinicSubscription>(`/subscriptions/clinics/${clinicId}/`); return data; }
export async function updateClinicSubscription(clinicId: number | string, payload: Partial<ClinicSubscription>) { const { data } = await api.patch<ClinicSubscription>(`/subscriptions/clinics/${clinicId}/`, payload); return data; }
export async function changeClinicPlan(clinicId: number | string, payload: { plan: number | string; billing_cycle: string; end_date?: string | null }) { const { data } = await api.patch<ClinicSubscription>(`/subscriptions/clinics/${clinicId}/change-plan/`, payload); return data; }
export async function suspendClinicSubscription(clinicId: number | string, reason: string) { const { data } = await api.patch<ClinicSubscription>(`/subscriptions/clinics/${clinicId}/suspend/`, { reason }); return data; }
export async function reactivateClinicSubscription(clinicId: number | string) { const { data } = await api.patch<ClinicSubscription>(`/subscriptions/clinics/${clinicId}/reactivate/`); return data; }
export async function cancelClinicSubscription(clinicId: number | string, reason: string) { const { data } = await api.patch<ClinicSubscription>(`/subscriptions/clinics/${clinicId}/cancel/`, { reason }); return data; }
export async function getMyPlanUsage() { const { data } = await api.get<PlanUsage>("/subscriptions/usage/"); return data; }
export async function getClinicPlanUsage(clinicId: number | string) { const { data } = await api.get<PlanUsage>(`/subscriptions/clinics/${clinicId}/usage/`); return data; }
export async function getEnabledFeatures() { const { data } = await api.get<SubscriptionFeatures>("/subscriptions/features/"); return data; }

