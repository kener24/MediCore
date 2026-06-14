import { apiClient } from '@/core/api/apiClient';
import { endpoints } from '@/core/api/endpoints';
import type { AuthResponse, LoginPayload, User } from '@/features/auth/types/auth.types';

export async function loginService(payload: LoginPayload) {
  const { data } = await apiClient.post<AuthResponse>(endpoints.auth.login, payload);
  return data;
}

export async function getMeService() {
  const { data } = await apiClient.get<User>(endpoints.auth.me);
  return data;
}
