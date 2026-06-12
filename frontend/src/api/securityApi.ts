import api from "./axios";
import type {
  AccountLock,
  EmailVerificationStatus,
  PasswordPolicy,
  PasswordPolicyValidation,
  SecurityActivity,
  SecuritySettings,
  UserSession,
} from "../types/security";

type Filters = Record<string, string | number | boolean | undefined>;

function params(filters?: Filters) {
  return { params: filters };
}

export async function requestPasswordReset(email: string) {
  const { data } = await api.post<{ detail: string; reset_url?: string; token?: string }>("/security/password-reset/request/", { email });
  return data;
}

export async function confirmPasswordReset(payload: { token: string; new_password: string; confirm_password: string }) {
  const { data } = await api.post<{ detail: string }>("/security/password-reset/confirm/", payload);
  return data;
}

export async function sendEmailVerification() {
  const { data } = await api.post<{ detail: string; verification_url?: string; token?: string }>("/security/email-verification/send/");
  return data;
}

export async function confirmEmailVerification(token: string) {
  const { data } = await api.post<{ detail: string }>("/security/email-verification/confirm/", { token });
  return data;
}

export async function getEmailVerificationStatus() {
  const { data } = await api.get<EmailVerificationStatus>("/security/email-verification/status/");
  return data;
}

export async function getAccountLockStatus() {
  const { data } = await api.get<{ locked: boolean; locked_until: string | null; reason: string; failed_attempts: number }>("/security/account-lock/status/");
  return data;
}

export async function getMySessions() {
  const { data } = await api.get<UserSession[]>("/security/sessions/");
  return data;
}

export async function revokeSession(id: number) {
  const { data } = await api.patch<UserSession>(`/security/sessions/${id}/revoke/`);
  return data;
}

export async function revokeAllSessions(keep_current = true) {
  const { data } = await api.post<{ detail: string }>("/security/sessions/revoke-all/", { keep_current });
  return data;
}

export async function getAdminSessions(filters?: Filters) {
  const { data } = await api.get<UserSession[]>("/security/admin/sessions/", params(filters));
  return data;
}

export async function revokeAdminSession(id: number) {
  const { data } = await api.patch<UserSession>(`/security/admin/sessions/${id}/revoke/`);
  return data;
}

export async function getAccountLocks(filters?: Filters) {
  const { data } = await api.get<AccountLock[]>("/security/account-locks/", params(filters));
  return data;
}

export async function unlockAccountLock(id: number) {
  const { data } = await api.patch<AccountLock>(`/security/account-locks/${id}/unlock/`);
  return data;
}

export async function getPasswordPolicy() {
  const { data } = await api.get<PasswordPolicy>("/security/password-policy/");
  return data;
}

export async function validatePasswordPolicy(password: string) {
  const { data } = await api.post<PasswordPolicyValidation>("/security/password-policy/validate/", { password });
  return data;
}

export async function getSecuritySettings() {
  const { data } = await api.get<SecuritySettings>("/security/settings/");
  return data;
}

export async function updateSecuritySettings(payload: Partial<SecuritySettings>) {
  const { data } = await api.patch<SecuritySettings>("/security/settings/", payload);
  return data;
}

export async function getMySecurityActivity() {
  const { data } = await api.get<SecurityActivity[]>("/audit/my-activity/");
  return data;
}
