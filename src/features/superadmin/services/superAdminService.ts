import { apiClient } from '@/core/api/apiClient';
import { endpoints } from '@/core/api/endpoints';
import { ApiClientError } from '@/core/api/authInterceptor';
import type {
  CreateClinicAdminPayload,
  CreateClinicPayload,
  ListResponse,
  SuperAdminAuditLog,
  SuperAdminClinic,
  SuperAdminDashboard,
  SuperAdminRole,
  SuperAdminUser,
  UpdateClinicAdminPayload,
  UpdateClinicPayload,
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

export async function getSuperAdminClinic(id: number | string) {
  return get<SuperAdminClinic>(endpoints.superAdmin.clinic(id));
}

export async function createSuperAdminClinic(payload: CreateClinicPayload) {
  const { data } = await apiClient.post<SuperAdminClinic>(endpoints.superAdmin.clinics, payload);
  return data;
}

export async function updateSuperAdminClinic(id: number | string, payload: UpdateClinicPayload) {
  return patch<SuperAdminClinic>(endpoints.superAdmin.clinic(id), payload);
}

export async function setClinicActive(id: number | string, active: boolean, reason: string) {
  return patch<SuperAdminClinic>(active ? endpoints.superAdmin.activateClinic(id) : endpoints.superAdmin.deactivateClinic(id), { reason });
}

export async function getSuperAdminUsers(params?: QueryParams) {
  return normalizeList<SuperAdminUser>(await get<unknown>(endpoints.superAdmin.users, params));
}

export async function getSuperAdminClinicAdmins(params?: QueryParams) {
  return normalizeList<SuperAdminUser>(await get<unknown>(endpoints.superAdmin.users, { role: 'admin', ...params }));
}

export async function getSuperAdminUser(id: number | string) {
  return get<SuperAdminUser>(endpoints.superAdmin.user(id));
}

export async function createSuperAdminClinicAdmin(payload: CreateClinicAdminPayload) {
  const { data } = await apiClient.post<SuperAdminUser>(endpoints.superAdmin.users, payload);
  return data;
}

export async function updateSuperAdminClinicAdmin(id: number | string, payload: UpdateClinicAdminPayload) {
  return patch<SuperAdminUser>(endpoints.superAdmin.user(id), payload);
}

export async function setUserActive(id: number | string, active: boolean, reason?: string) {
  return patch<SuperAdminUser>(active ? endpoints.superAdmin.activateUser(id) : endpoints.superAdmin.deactivateUser(id), reason ? { reason } : undefined);
}

export async function getSuperAdminRoles() {
  return normalizeList<SuperAdminRole>(await get<unknown>(endpoints.superAdmin.roles));
}

export async function getClinicAdminRoleId() {
  const roles = await getSuperAdminRoles();
  const adminRole = roles.find((role) => role.nombre === 'admin');
  if (!adminRole) throw new Error('No se encontró el rol admin de clínica.');
  return adminRole.id;
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
