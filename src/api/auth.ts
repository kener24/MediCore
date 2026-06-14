import { apiRequest } from '@/api/client';
import type { AuthResponse, LoginPayload, User } from '@/types/auth';

export function login(payload: LoginPayload) {
  return apiRequest<AuthResponse>('/auth/login/', {
    method: 'POST',
    body: payload,
    auth: false,
  });
}

export function getMe() {
  return apiRequest<User>('/auth/me/');
}
