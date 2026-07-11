import { apiClient } from '@/core/api/apiClient';
import { ApiClientError } from '@/core/api/authInterceptor';
import type { AdminListResponse } from '@/features/admin/types/admin.types';

export type AdminQueryParams = Record<string, string | number | boolean | undefined | null>;

const unavailableAdminAction = 'Esta información administrativa no está disponible por el momento.';

export function normalizeAdminList<T>(response: AdminListResponse<T> | unknown): T[] {
  if (Array.isArray(response)) return response;
  const payload = response as { results?: T[]; data?: T[]; items?: T[] } | null;
  if (payload && Array.isArray(payload.results)) return payload.results;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && Array.isArray(payload.items)) return payload.items;
  return [];
}

export async function getFirstAvailable<T>(urls: string[], params?: AdminQueryParams): Promise<T> {
  let lastError: unknown;
  for (const url of urls) {
    try {
      const { data } = await apiClient.get<T>(url, { params });
      return data;
    } catch (error) {
      lastError = error;
      if (error instanceof ApiClientError && error.status && ![404, 405].includes(error.status)) throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(unavailableAdminAction);
}

export async function postFirstAvailable<T>(urls: string[], payload?: unknown): Promise<T> {
  let lastError: unknown;
  for (const url of urls) {
    try {
      const { data } = await apiClient.post<T>(url, payload ?? {});
      return data;
    } catch (error) {
      lastError = error;
      if (error instanceof ApiClientError && error.status && ![404, 405].includes(error.status)) throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(unavailableAdminAction);
}
