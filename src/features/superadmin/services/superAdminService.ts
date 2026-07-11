import { apiClient } from '@/core/api/apiClient';
import { endpoints } from '@/core/api/endpoints';
import { ApiClientError } from '@/core/api/authInterceptor';
import type {
  CreateClinicPayload,
  ListResponse,
  SuperAdminAuditLog,
  SuperAdminClinic,
  SuperAdminDashboard,
  SuperAdminRole,
  SuperAdminUser,
} from '@/features/superadmin/types/superAdmin.types';

type QueryParams = Record<string, string | number | boolean | undefined | null>;

export function normalizeList<T>(response: ListResponse<T> | unknown): T[] {
  if (Array.isArray(response)) return response;
  const payload = response as { results?: T[]; data?: T[]; items?: T[] } | null;
  if (payload && Array.isArray(payload.results)) return payload.results;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && Array.isArray(payload.items)) return payload.items;
  return [];
}

async function get<T>(url: string, params?: QueryParams): Promise<T> {
  const { data } = await apiClient.get<T>(url, { params });
  return data;
}

async function patch<T>(url: string, payload?: unknown): Promise<T> {
  const { data } = await apiClient.patch<T>(url, payload ?? {});
  return data;
}

export async function getSuperAdminDashboard() {
  return get<SuperAdminDashboard>(endpoints.superAdmin.dashboard);
}

export async function getSuperAdminClinics(params?: QueryParams) {
  return normalizeList<SuperAdminClinic>(await get<unknown>(endpoints.superAdmin.clinics, params));
}

export async function createSuperAdminClinic(payload: CreateClinicPayload) {
  const { data } = await apiClient.post<SuperAdminClinic>(endpoints.superAdmin.clinics, payload);
  return data;
}

export async function setClinicActive(id: number | string, active: boolean) {
  return patch<SuperAdminClinic>(active ? endpoints.superAdmin.activateClinic(id) : endpoints.superAdmin.deactivateClinic(id));
}

export async function getSuperAdminUsers(params?: QueryParams) {
  return normalizeList<SuperAdminUser>(await get<unknown>(endpoints.superAdmin.users, params));
}

export async function setUserActive(id: number | string, active: boolean) {
  return patch<SuperAdminUser>(active ? endpoints.superAdmin.activateUser(id) : endpoints.superAdmin.deactivateUser(id));
}

export async function getSuperAdminRoles() {
  return normalizeList<SuperAdminRole>(await get<unknown>(endpoints.superAdmin.roles));
}

export async function getSuperAdminAuditLogs() {
  return normalizeList<SuperAdminAuditLog>(await get<unknown>(endpoints.superAdmin.auditLogs, { page_size: 12 }));
}

export async function getSuperAdminSubscriptions() {
  try {
    return normalizeList<Record<string, unknown>>(await get<unknown>(endpoints.superAdmin.subscriptions));
  } catch (error) {
    if (error instanceof ApiClientError && [403, 404, 405].includes(error.status ?? 0)) return [];
    throw error;
  }
}

export function clinicName(clinic: SuperAdminClinic) {
  return clinic.nombre || 'Clínica sin nombre';
}

export function userName(user: SuperAdminUser) {
  return user.nombre_completo || user.email;
}

export function userRole(user: SuperAdminUser) {
  if (typeof user.role === 'object') return user.role.nombre || user.role_nombre || 'Sin rol';
  return user.role_nombre || 'Sin rol';
}

