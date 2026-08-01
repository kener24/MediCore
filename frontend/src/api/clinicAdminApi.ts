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
  page?: number;
  page_size?: number;
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

export async function getClinicUsersPage(filters?: ClinicUserFilters) {
  const { data } = await api.get<ClinicAdminUser[] | { count?: number; next?: string | null; previous?: string | null; results?: ClinicAdminUser[] }>("/clinic-admin/users/", { params: filters });
  if (Array.isArray(data)) return { count: data.length, next: null, previous: null, results: data };
  const results = data.results ?? [];
  return { count: data.count ?? results.length, next: data.next ?? null, previous: data.previous ?? null, results };
}

export async function getClinicUsers(filters?: ClinicUserFilters) {
  return (await getClinicUsersPage(filters)).results;
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

export async function activateClinicUser(id: string | number, reason: string) {
  const { data } = await api.patch<ClinicAdminUser>(`/clinic-admin/users/${id}/activate/`, { reason });
  return data;
}

export async function deactivateClinicUser(id: string | number, reason: string) {
  const { data } = await api.patch<ClinicAdminUser>(`/clinic-admin/users/${id}/deactivate/`, { reason });
  return data;
}
