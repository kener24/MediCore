import { API_BASE_URL } from '@/config/api';
import { getStoredSession } from '@/lib/secureSession';

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  auth?: boolean;
};

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

function extractErrorMessage(payload: unknown) {
  if (payload && typeof payload === 'object') {
    const data = payload as Record<string, unknown>;
    const firstValue = Object.values(data)[0];
    if (typeof data.detail === 'string') return data.detail;
    if (Array.isArray(firstValue)) return String(firstValue[0]);
    if (typeof firstValue === 'string') return firstValue;
  }
  return 'No se pudo completar la solicitud.';
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (options.auth !== false) {
    const { accessToken, sessionKey } = await getStoredSession();
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    if (sessionKey) headers['X-Session-Key'] = sessionKey;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new ApiError(extractErrorMessage(payload), response.status, payload);
  }

  return payload as T;
}
