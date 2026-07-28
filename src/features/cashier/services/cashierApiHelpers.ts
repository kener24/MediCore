import { apiClient } from '@/core/api/apiClient';
import { ApiClientError } from '@/core/api/authInterceptor';
import type { QueryParams } from '@/features/cashier/types/commonCashier.types';
import type { AxiosRequestConfig } from 'axios';

export const unavailableCashierAction = 'Esta acción no está disponible por el momento.';

export async function getFirstAvailable<T>(urls: string[], params?: QueryParams): Promise<T> {
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
  throw lastError instanceof Error ? lastError : new Error(unavailableCashierAction);
}

export async function postFirstAvailable<T>(urls: string[], payload?: unknown, config?: AxiosRequestConfig): Promise<T> {
  let lastError: unknown;
  for (const url of urls) {
    try {
      const { data } = await apiClient.post<T>(url, payload ?? {}, config);
      return data;
    } catch (error) {
      lastError = error;
      if (error instanceof ApiClientError && error.status && ![404, 405].includes(error.status)) throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(unavailableCashierAction);
}
