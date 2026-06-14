import type { AxiosError, AxiosInstance } from 'axios';

import { clearSession, getSession } from '@/core/storage/sessionStorage';

export class ApiClientError extends Error {
  status?: number;
  payload?: unknown;

  constructor(message: string, status?: number, payload?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.payload = payload;
  }
}

function extractErrorMessage(error: AxiosError) {
  if (!error.response) {
    return 'No hay conexion con el servidor. Revisa tu internet e intenta nuevamente.';
  }

  const status = error.response.status;
  const payload = error.response.data;

  if (status === 401) return 'Tu sesion expiro. Inicia sesion nuevamente.';
  if (status === 403) return 'No tienes permisos para realizar esta accion.';
  if (status >= 500) return 'El servidor no pudo responder. Intenta mas tarde.';

  if (payload && typeof payload === 'object') {
    const data = payload as Record<string, unknown>;
    const firstValue = Object.values(data)[0];
    if (typeof data.detail === 'string') return data.detail;
    if (Array.isArray(firstValue)) return String(firstValue[0]);
    if (typeof firstValue === 'string') return firstValue;
  }

  return 'No se pudo completar la solicitud.';
}

export function setupAuthInterceptors(apiClient: AxiosInstance) {
  apiClient.interceptors.request.use(async (config) => {
    const { accessToken, sessionKey } = await getSession();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    if (sessionKey) {
      config.headers['X-Session-Key'] = sessionKey;
    }
    return config;
  });

  apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      if (error.response?.status === 401) {
        await clearSession();
      }
      return Promise.reject(
        new ApiClientError(extractErrorMessage(error), error.response?.status, error.response?.data),
      );
    },
  );
}
