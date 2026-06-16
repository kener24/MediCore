import { apiClient } from '@/core/api/apiClient';
import { ApiClientError } from '@/core/api/authInterceptor';

export async function getFirstAvailable<T>(
  urls: string[],
  config?: { params?: Record<string, string | number | undefined> },
) {
  let lastError: unknown;
  for (const url of urls) {
    try {
      const { data } = await apiClient.get<T>(url, config);
      return data;
    } catch (err) {
      lastError = err;
      if (err instanceof ApiClientError && err.status && ![404, 405].includes(err.status)) {
        throw err;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Este modulo aun no esta disponible.');
}

export async function postFirstAvailable<T>(urls: string[], payload?: unknown) {
  let lastError: unknown;
  for (const url of urls) {
    try {
      const { data } = await apiClient.post<T>(url, payload ?? {});
      return data;
    } catch (err) {
      lastError = err;
      if (err instanceof ApiClientError && err.status && ![404, 405].includes(err.status)) {
        throw err;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Este modulo aun no esta disponible.');
}

export async function patchFirstAvailable<T>(urls: string[], payload?: unknown) {
  let lastError: unknown;
  for (const url of urls) {
    try {
      const { data } = await apiClient.patch<T>(url, payload ?? {});
      return data;
    } catch (err) {
      lastError = err;
      if (err instanceof ApiClientError && err.status && ![404, 405].includes(err.status)) {
        throw err;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Este modulo aun no esta disponible.');
}
