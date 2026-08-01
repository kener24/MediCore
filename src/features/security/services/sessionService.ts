import { apiClient } from '@/core/api/apiClient';
import { endpoints } from '@/core/api/endpoints';
import { isDeviceOnline } from '@/core/network/connectivity';

export type ManagedSession = {
  id: number;
  user?: number;
  user_email?: string;
  user_nombre?: string;
  user_role?: string;
  device_name?: string;
  active?: boolean;
  current?: boolean;
  created_at?: string;
  last_activity_at?: string;
  revoked_at?: string | null;
  expires_at?: string;
  is_expired?: boolean;
  location_hint?: string;
  platform?: string;
};

type ListResponse<T> = T[] | { results?: T[]; data?: T[]; items?: T[] };

function normalizeList<T>(response: ListResponse<T>): T[] {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.results)) return response.results;
  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response.items)) return response.items;
  return [];
}

export async function getManagedSessions(params?: { active?: boolean; user?: number | string }) {
  const { data } = await apiClient.get<ListResponse<ManagedSession>>('/security/admin/sessions/', { params: { active: true, ...params } });
  return normalizeList(data);
}

export async function revokeManagedSession(id: number | string, reason = 'Cierre remoto autorizado por administración.') {
  if (!(await isDeviceOnline())) throw new Error('Esta operación requiere conexión al servidor.');
  const { data } = await apiClient.patch<ManagedSession>(`/security/admin/sessions/${id}/revoke/`, { reason });
  return data;
}

export async function getOwnSessions() {
  const { data } = await apiClient.get<ListResponse<ManagedSession>>(endpoints.security.sessions);
  return normalizeList(data);
}

export async function revokeOwnSession(id: number | string) {
  const { data } = await apiClient.post<ManagedSession>(endpoints.security.revokeSession(id));
  return data;
}

export async function revokeOtherOwnSessions() {
  const { data } = await apiClient.post<{ detail: string }>(endpoints.security.revokeAllSessions, { keep_current: true });
  return data;
}
