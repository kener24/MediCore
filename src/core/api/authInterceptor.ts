import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

import { buildApiCacheKey, cacheApiResponse, clearApiCache, getCachedApiResponse } from '@/core/api/apiCache';
import { endpoints } from '@/core/api/endpoints';
import { appConfig } from '@/core/config/appConfig';
import { clearSession, getSession, saveSession } from '@/core/storage/sessionStorage';

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _cacheKey?: string;
  _cacheUserKey?: string;
  _retry?: boolean;
};

let onSessionExpired: ((message?: string) => void) | null = null;
let sessionExpirationNotified = false;
let refreshPromise: Promise<string | null> | null = null;

export function setSessionExpiredHandler(handler: ((message?: string) => void) | null) {
  onSessionExpired = handler;
}

export function resetSessionExpiredNotification() {
  sessionExpirationNotified = false;
}

export class ApiClientError extends Error {
  code?: string;
  payload?: unknown;
  status?: number;

  constructor(message: string, status?: number, payload?: unknown, code?: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.payload = payload;
    this.code = code;
  }
}

function extractErrorMessage(error: AxiosError) {
  if (!error.response) {
    if (error.code === 'ECONNABORTED') return 'La conexión tardó demasiado. Revisa internet e intenta nuevamente.';
    return 'No se pudo conectar con MediCore. Revisa internet o intenta de nuevo en unos minutos.';
  }

  const status = error.response.status;
  const payload = error.response.data;

  if (status === 400) return extractValidationMessage(payload);
  if (status === 401) return 'Tu sesión expiró. Inicia sesión nuevamente.';
  if (status === 403) return 'Tu usuario no tiene permiso para realizar esta acción.';
  if (status === 404) return 'No se encontró la información solicitada. Actualiza la pantalla e intenta nuevamente.';
  if (status >= 500) return 'El servidor no pudo procesar la solicitud en este momento. Intenta nuevamente y, si continúa, avisa a soporte.';

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

function isReadRequest(config?: RetriableRequestConfig) {
  return (config?.method ?? 'get').toLowerCase() === 'get';
}

async function expireSession(message?: string) {
  await clearSession();
  await clearApiCache();
  if (sessionExpirationNotified) return;
  sessionExpirationNotified = true;
  onSessionExpired?.(message);
}

async function refreshAccessToken() {
  const session = await getSession();
  if (!session.refreshToken || !session.sessionKey) return null;
  const { data } = await axios.post<{ access?: string; refresh?: string }>(
    `${appConfig.API_BASE_URL}${endpoints.auth.refresh}`,
    { refresh: session.refreshToken },
    {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Session-Key': session.sessionKey,
      },
    },
  );
  if (!data.access) return null;
  await saveSession({
    accessToken: data.access,
    refreshToken: data.refresh ?? session.refreshToken,
    sessionKey: session.sessionKey,
    user: session.user,
  });
  return data.access;
}

export function setupAuthInterceptors(apiClient: AxiosInstance) {
  apiClient.interceptors.request.use(async (config) => {
    const { accessToken, sessionKey, user } = await getSession();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    if (sessionKey) {
      config.headers['X-Session-Key'] = sessionKey;
    }

    const cacheableConfig = config as RetriableRequestConfig;
    const clinicId = typeof user?.clinica === 'object' ? user.clinica?.id : user?.clinica;
    cacheableConfig._cacheUserKey = accessToken
      ? `${user?.id ?? 'user'}:${clinicId ?? 'clinic'}:${sessionKey ?? 'session'}`
      : 'anonymous';
    if (isReadRequest(cacheableConfig)) {
      cacheableConfig._cacheKey = buildApiCacheKey({
        baseURL: config.baseURL,
        method: config.method,
        params: config.params,
        url: config.url,
        userKey: cacheableConfig._cacheUserKey,
      });
    }
    return config;
  });

  apiClient.interceptors.response.use(
    (response) => {
      const config = response.config as RetriableRequestConfig;
      if (config._cacheKey && isReadRequest(config)) {
        void cacheApiResponse(config._cacheKey, response.data);
      }
      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as RetriableRequestConfig | undefined;

      if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
        const session = await getSession();
        if (session.refreshToken) {
          originalRequest._retry = true;
          try {
            if (!refreshPromise) {
              refreshPromise = refreshAccessToken().finally(() => {
                refreshPromise = null;
              });
            }
            const accessToken = await refreshPromise;
            if (accessToken) {
              resetSessionExpiredNotification();
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return apiClient(originalRequest);
            }
          } catch {
            await expireSession('Tu sesión expiró por seguridad. Inicia sesión nuevamente para continuar.');
          }
        }
      }

      if (error.response?.status === 401) {
        await expireSession(extractErrorMessage(error));
      }

      if (originalRequest?._cacheKey && isReadRequest(originalRequest) && (!error.response || error.response.status >= 500)) {
        const cached = await getCachedApiResponse(originalRequest._cacheKey);
        if (cached) {
          return {
            config: originalRequest,
            data: cached.data,
            headers: {},
            request: error.request,
            status: 200,
            statusText: cached.stale ? 'OK_FROM_STALE_CACHE' : 'OK_FROM_CACHE',
          };
        }
      }

      return Promise.reject(
        new ApiClientError(extractErrorMessage(error), error.response?.status, error.response?.data, error.code),
      );
    },
  );
}
