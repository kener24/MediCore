import api from "./axios";
import type {
  ClinicAdminUser,
  ClinicDashboardStats,
  ClinicUserCreatePayload,
  ClinicUserUpdatePayload,
  MyClinicUpdatePayload,
} from "../types/clinicAdmin";
import type { Clinic } from "../types/clinic";

export interface ClinicUserFilters {
  role?: string;
  is_active?: string;
  search?: string;
}

export async function getClinicDashboard() {
  const { data } = await api.get<ClinicDashboardStats>("/clinic-admin/dashboard/");
  return data;
}

export async function getMyClinic() {
  const { data } = await api.get<Clinic>("/clinic-admin/my-clinic/");
  return data;
}

export async function updateMyClinic(payload: MyClinicUpdatePayload) {
  const { data } = await api.patch<Clinic>("/clinic-admin/my-clinic/", payload);
  return data;
}

export async function getClinicUsers(filters?: ClinicUserFilters) {
  const { data } = await api.get<ClinicAdminUser[]>("/clinic-admin/users/", { params: filters });
  return data;
}

export async function getClinicUser(id: string | number) {
  const { data } = await api.get<ClinicAdminUser>(`/clinic-admin/users/${id}/`);
  return data;
}

export async function createClinicUser(payload: ClinicUserCreatePayload) {
  const { data } = await api.post<ClinicAdminUser>("/clinic-admin/users/", payload);
  return data;
}

export async function updateClinicUser(id: string | number, payload: ClinicUserUpdatePayload) {
  const { data } = await api.patch<ClinicAdminUser>(`/clinic-admin/users/${id}/`, payload);
  return data;
}

export async function activateClinicUser(id: string | number) {
  const { data } = await api.patch<ClinicAdminUser>(`/clinic-admin/users/${id}/activate/`);
  return data;
}

export async function deactivateClinicUser(id: string | number) {
  const { data } = await api.patch<ClinicAdminUser>(`/clinic-admin/users/${id}/deactivate/`);
  return data;
}
