import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { toast } from "sonner";

import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, SESSION_KEY } from "../utils/constants";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let queuedRequests: Array<(token: string | null) => void> = [];

function resolveQueue(token: string | null) {
  queuedRequests.forEach((callback) => callback(token));
  queuedRequests = [];
}

function clearSession(expired = false) {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key?.startsWith("medicore.")) localStorage.removeItem(key);
  }
  for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = sessionStorage.key(index);
    if (key?.startsWith("medicore.")) sessionStorage.removeItem(key);
  }
  if (expired) sessionStorage.setItem("medicore.session-expired", "1");
  window.dispatchEvent(new Event("medicore:logout"));
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const sessionKey = localStorage.getItem(SESSION_KEY);
  if (sessionKey) {
    config.headers["X-Session-Key"] = sessionKey;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 403) {
      toast.error("No tienes permiso para realizar esta acción.");
      return Promise.reject(error);
    }

    if (error.response?.status !== 401 || originalRequest?._retry) {
      return Promise.reject(error);
    }

    const refresh = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refresh) {
      clearSession(true);
      window.location.assign("/session-expired");
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queuedRequests.push((token) => {
          if (!token) {
            reject(error);
            return;
          }
          originalRequest._retry = true;
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(api(originalRequest));
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const sessionKey = localStorage.getItem(SESSION_KEY);
      const response = await axios.post<{ access: string; refresh?: string }>(
        `${api.defaults.baseURL}/auth/refresh/`,
        { refresh },
        { headers: sessionKey ? { "X-Session-Key": sessionKey } : undefined }
      );
      localStorage.setItem(ACCESS_TOKEN_KEY, response.data.access);
      if (response.data.refresh) localStorage.setItem(REFRESH_TOKEN_KEY, response.data.refresh);
      resolveQueue(response.data.access);
      originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
      return api(originalRequest);
    } catch (refreshError) {
      resolveQueue(null);
      clearSession(true);
      window.location.assign("/session-expired");
      toast.error("Tu sesión expiró. Inicia sesión nuevamente.");
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === "string") {
      if (data.trim().startsWith("<")) return "El servidor devolvio un error interno. Revisa la configuracion o intenta nuevamente.";
      return data;
    }
    if (data && typeof data === "object") {
      const firstValue = Object.values(data)[0];
      if (Array.isArray(firstValue)) return String(firstValue[0]);
      if (typeof firstValue === "string") return firstValue;
      if ("detail" in data) return String(data.detail);
    }
    if (error.response?.status === 403) return "No tienes permiso para realizar esta acción.";
  }
  return "Ocurrió un error inesperado.";
}

export default api;
