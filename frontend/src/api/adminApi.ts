import api from "./axios";
import type { PlanUsage } from "../types/subscription";
import type { SuperAdminAlert, SuperAdminDashboard, SuperAdminSystemStatus } from "../types/dashboard";

export async function getSuperAdminDashboard(params?: Record<string, string>) {
  const { data } = await api.get<SuperAdminDashboard>("/admin/dashboard/", { params });
  return data;
}

export async function getSuperAdminAlerts() {
  const { data } = await api.get<{ count: number; results: SuperAdminAlert[] }>("/admin/alerts/");
  return data;
}

export async function getSuperAdminUsage() {
  const { data } = await api.get<{ count: number; results: Array<PlanUsage & { clinic_id: number; clinic_name: string }> }>("/admin/usage/");
  return data;
}

export async function getSuperAdminSystemStatus() {
  const { data } = await api.get<SuperAdminSystemStatus>("/admin/system-status/");
  return data;
}
