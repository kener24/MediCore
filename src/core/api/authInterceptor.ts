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
    return 'No se pudo conectar con el servidor. Revisa tu conexion.';
  }

  const status = error.response.status;
  const payload = error.response.data;

  if (status === 400) return extractValidationMessage(payload);
  if (status === 401) return 'Tu sesion expiro. Inicia sesion nuevamente.';
  if (status === 403) return 'No tienes permiso para realizar esta accion.';
  if (status === 404) return 'No se encontro la informacion solicitada.';
  if (status >= 500) return 'Ocurrio un error en el servidor.';

  return extractPayloadMessage(payload) || 'No se pudo completar la solicitud.';
}

function extractValidationMessage(payload: unknown) {
  const message = extractPayloadMessage(payload);
  return message || 'Revisa los campos ingresados.';
}

function extractPayloadMessage(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const data = payload as Record<string, unknown>;
  if (typeof data.detail === 'string') return data.detail;
  if (typeof data.message === 'string') return data.message;

  const firstValue = Object.values(data)[0];
  if (Array.isArray(firstValue) && typeof firstValue[0] === 'string') return firstValue[0];
  if (typeof firstValue === 'string') return firstValue;
  return '';
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
