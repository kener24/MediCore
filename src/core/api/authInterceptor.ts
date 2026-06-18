import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

import { endpoints } from '@/core/api/endpoints';
import { appConfig } from '@/core/config/appConfig';
import { clearSession, getSession, saveSession } from '@/core/storage/sessionStorage';

type RetriableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let onSessionExpired: (() => void) | null = null;

export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

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
    return 'No hay conexión con el servidor. Revisa tu internet e intenta nuevamente.';
  }

  const status = error.response.status;
  const payload = error.response.data;

  if (status === 401) return 'Tu sesión expiró. Inicia sesión nuevamente.';
  if (status === 403) return 'No tienes permisos para realizar esta acción.';
  if (status >= 500) return 'El servidor no pudo responder. Intenta más tarde.';

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
      const originalRequest = error.config as RetriableRequestConfig | undefined;

      if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
        const session = await getSession();
        if (session.refreshToken) {
          originalRequest._retry = true;
          try {
            const { data } = await axios.post<{ access?: string; refresh?: string }>(
              `${appConfig.API_BASE_URL}${endpoints.auth.refresh}`,
              { refresh: session.refreshToken },
              { headers: { Accept: 'application/json', 'Content-Type': 'application/json' } },
            );

            if (data.access) {
              await saveSession({
                accessToken: data.access,
                refreshToken: data.refresh ?? session.refreshToken,
                sessionKey: session.sessionKey ?? undefined,
                user: session.user,
              });
              originalRequest.headers.Authorization = `Bearer ${data.access}`;
              return apiClient(originalRequest);
            }
          } catch {
            await clearSession();
            onSessionExpired?.();
          }
        }
      }

      if (error.response?.status === 401) {
        await clearSession();
        onSessionExpired?.();
      }
      return Promise.reject(
        new ApiClientError(extractErrorMessage(error), error.response?.status, error.response?.data),
      );
    },
  );
}
