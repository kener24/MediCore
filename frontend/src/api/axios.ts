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

function clearSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
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

    if (error.response?.status !== 401 || originalRequest?._retry) {
      return Promise.reject(error);
    }

    const refresh = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refresh) {
      clearSession();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queuedRequests.push((token) => {
          if (!token) {
            reject(error);
            return;
          }
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(api(originalRequest));
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const response = await axios.post<{ access: string }>(
        `${api.defaults.baseURL}/auth/refresh/`,
        { refresh }
      );
      localStorage.setItem(ACCESS_TOKEN_KEY, response.data.access);
      resolveQueue(response.data.access);
      originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
      return api(originalRequest);
    } catch (refreshError) {
      resolveQueue(null);
      clearSession();
      toast.error("La sesión expiró. Inicia sesión nuevamente.");
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === "string") return data;
    if (data && typeof data === "object") {
      const firstValue = Object.values(data)[0];
      if (Array.isArray(firstValue)) return String(firstValue[0]);
      if (typeof firstValue === "string") return firstValue;
      if ("detail" in data) return String(data.detail);
    }
    if (error.response?.status === 403) return "No tienes permisos para esta acción.";
  }
  return "Ocurrió un error inesperado.";
}

export default api;
