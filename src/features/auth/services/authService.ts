import { apiClient } from '@/core/api/apiClient';
import { endpoints } from '@/core/api/endpoints';
import type {
  AuthResponse,
  ChangePasswordPayload,
  LoginPayload,
  User,
} from '@/features/auth/types/auth.types';

export async function loginService(payload: LoginPayload) {
  const { data } = await apiClient.post<AuthResponse>(endpoints.auth.login, payload);
  return data;
}

export async function getMeService() {
  const { data } = await apiClient.get<User>(endpoints.auth.me);
  return data;
}

export async function changePasswordService(payload: ChangePasswordPayload) {
  const { data } = await apiClient.post(endpoints.auth.changePassword, {
    confirm_password: payload.confirm_password,
    new_password: payload.new_password,
    old_password: payload.current_password,
  });
  return data;
}

export async function logoutService() {
  try {
    await apiClient.post(endpoints.auth.logout);
  } catch {
    // Logout local must continue even when the optional backend endpoint is unavailable.
  }
}
