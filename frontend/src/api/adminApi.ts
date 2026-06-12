import api from "./axios";
import type { SuperAdminDashboard } from "../types/dashboard";

export async function getSuperAdminDashboard() {
  const { data } = await api.get<SuperAdminDashboard>("/admin/dashboard/");
  return data;
}
