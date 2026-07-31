import { apiClient } from '@/core/api/apiClient';
import { endpoints } from '@/core/api/endpoints';

export type ManagedSession = {
  id: number;
  user?: number;
  user_email?: string;
  user_nombre?: string;
  device_name?: string;
  ip_address?: string | null;
  user_agent?: string;
  active?: boolean;
  current?: boolean;
  created_at?: string;
  last_activity_at?: string;
  revoked_at?: string | null;
  expires_at?: string;
  expired?: boolean;
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

export async function revokeManagedSession(id: number | string) {
  const { data } = await apiClient.patch<ManagedSession>(`/security/admin/sessions/${id}/revoke/`);
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
