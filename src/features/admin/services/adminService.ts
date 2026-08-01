import { endpoints } from '@/core/api/endpoints';
import { apiClient } from '@/core/api/apiClient';
import { isDeviceOnline } from '@/core/network/connectivity';
import { getFirstAvailable, normalizeAdminList, patchFirstAvailable, postFirstAvailable, type AdminQueryParams } from '@/features/admin/services/adminApiHelpers';
import type {
  AdminAuditLog,
  AdminAccountLock,
  AdminClinic,
  AdminDashboard,
  AdminDoctorProfile,
  AdminDoctorSchedule,
  AdminDoctorSchedulePayload,
  AdminFiscalRange,
  AdminFiscalReadiness,
  AdminReportSummary,
  AdminRolePermissions,
  AdminSpecialty,
  AdminSubscription,
  AdminUsage,
  AdminOperationalAlert,
  AdminOperationStatus,
  AdminUser,
  CreateClinicUserPayload,
  CreateDoctorProfilePayload,
  UpdateAdminClinicPayload,
  UpdateAdminDoctorProfilePayload,
  UpdateAdminUserPayload,
} from '@/features/admin/types/admin.types';

const ADMIN_ONLINE_REQUIRED = 'Esta operación requiere conexión al servidor.';

async function ensureAdminMutationOnline() {
  if (!(await isDeviceOnline())) throw new Error(ADMIN_ONLINE_REQUIRED);
}

export async function getAdminDashboard(params?: AdminQueryParams): Promise<AdminDashboard> {
  return getFirstAvailable<AdminDashboard>([endpoints.clinicAdmin.dashboard, endpoints.clinicAdmin.clinicReport], params);
}

export async function getAdminAlerts(): Promise<AdminOperationalAlert[]> {
  const data = await getFirstAvailable<unknown>([endpoints.clinicAdmin.alerts]);
  return normalizeAdminList<AdminOperationalAlert>(data);
}

export async function getAdminOperationStatus(): Promise<AdminOperationStatus> {
  const data = await getFirstAvailable<{ operation_status: AdminOperationStatus }>([endpoints.clinicAdmin.operationStatus]);
  return data.operation_status;
}

export async function getAdminClinic(): Promise<AdminClinic> {
  return getFirstAvailable<AdminClinic>([endpoints.clinicAdmin.myClinic]);
}

export async function updateAdminClinic(payload: UpdateAdminClinicPayload): Promise<AdminClinic> {
  await ensureAdminMutationOnline();
  return patchFirstAvailable<AdminClinic>([endpoints.clinicAdmin.myClinic], payload);
}

export async function getAdminUsers(params?: AdminQueryParams): Promise<AdminUser[]> {
  const data = await getFirstAvailable<unknown>([endpoints.clinicAdmin.users, '/users/'], params);
  return normalizeAdminList<AdminUser>(data);
}

export async function getAdminUsersPage(params?: AdminQueryParams): Promise<{ count: number; next: string | null; previous: string | null; results: AdminUser[] }> {
  const { data } = await apiClient.get<unknown>(endpoints.clinicAdmin.users, { params });
  if (Array.isArray(data)) return { count: data.length, next: null, previous: null, results: data as AdminUser[] };
  const page = data as { count?: number; next?: string | null; previous?: string | null; results?: AdminUser[] };
  const results = Array.isArray(page.results) ? page.results : normalizeAdminList<AdminUser>(data);
  return { count: page.count ?? results.length, next: page.next ?? null, previous: page.previous ?? null, results };
}

export async function getAdminUser(id: number | string): Promise<AdminUser> {
  return getFirstAvailable<AdminUser>([endpoints.clinicAdmin.user(id)]);
}

export async function updateAdminUser(id: number | string, payload: UpdateAdminUserPayload): Promise<AdminUser> {
  await ensureAdminMutationOnline();
  return patchFirstAvailable<AdminUser>([endpoints.clinicAdmin.user(id)], payload);
}

export async function getAdminRolePermissions(): Promise<AdminRolePermissions> {
  return getFirstAvailable<AdminRolePermissions>(['/roles/permissions/']);
}

export async function getAdminSpecialties(): Promise<AdminSpecialty[]> {
  const data = await getFirstAvailable<unknown>([endpoints.clinicAdmin.specialties], { is_active: true });
  return normalizeAdminList<AdminSpecialty>(data);
}

export async function createClinicUser(payload: CreateClinicUserPayload): Promise<AdminUser> {
  await ensureAdminMutationOnline();
  return postFirstAvailable<AdminUser>([endpoints.clinicAdmin.users], payload);
}

export async function createDoctorProfile(payload: CreateDoctorProfilePayload) {
  await ensureAdminMutationOnline();
  return postFirstAvailable([endpoints.clinicAdmin.doctors], payload);
}

export async function getAdminDoctorProfiles(params?: AdminQueryParams): Promise<AdminDoctorProfile[]> {
  const data = await getFirstAvailable<unknown>([endpoints.clinicAdmin.doctors], params);
  return normalizeAdminList<AdminDoctorProfile>(data);
}

export async function findAdminDoctorProfileForUser(user: AdminUser): Promise<AdminDoctorProfile | null> {
  const profiles = await getAdminDoctorProfiles({ search: user.email });
  return profiles.find((profile) => {
    if (typeof profile.user === 'number') return profile.user === user.id;
    return profile.user?.id === user.id || profile.user_email === user.email;
  }) ?? null;
}

export async function updateAdminDoctorProfile(id: number | string, payload: UpdateAdminDoctorProfilePayload): Promise<AdminDoctorProfile> {
  await ensureAdminMutationOnline();
  return patchFirstAvailable<AdminDoctorProfile>([`${endpoints.clinicAdmin.doctors}${id}/`], payload);
}

export async function createClinicStaff(payload: CreateClinicUserPayload, doctorProfile?: Omit<CreateDoctorProfilePayload, 'user'>): Promise<AdminUser> {
  await ensureAdminMutationOnline();
  const requestKey = `staff-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const { data } = await apiClient.post<AdminUser>(endpoints.clinicAdmin.createStaff, {
    ...payload,
    doctor_profile: doctorProfile,
  }, { headers: { 'Idempotency-Key': requestKey } });
  return data;
}

export async function setAdminUserActive(id: number | string, active: boolean, reason?: string): Promise<AdminUser> {
  await ensureAdminMutationOnline();
  return patchFirstAvailable<AdminUser>([active ? endpoints.clinicAdmin.activateUser(id) : endpoints.clinicAdmin.deactivateUser(id)], reason ? { reason } : undefined);
}

export async function requestAdminPasswordReset(userId: number | string): Promise<void> {
  await ensureAdminMutationOnline();
  await postFirstAvailable([endpoints.clinicAdmin.resetUserPassword(userId)]);
}

export async function revokeAdminUserSessions(userId: number | string, reason: string): Promise<{ detail: string; sessions_revoked: number }> {
  await ensureAdminMutationOnline();
  return postFirstAvailable([endpoints.clinicAdmin.revokeUserSessions(userId)], { reason });
}

export async function getAdminDoctorSchedules(doctorId: number | string): Promise<AdminDoctorSchedule[]> {
  const data = await getFirstAvailable<unknown>([endpoints.clinicAdmin.doctorSchedules(doctorId)]);
  return normalizeAdminList<AdminDoctorSchedule>(data);
}

export async function createAdminDoctorSchedule(doctorId: number | string, payload: AdminDoctorSchedulePayload): Promise<AdminDoctorSchedule> {
  await ensureAdminMutationOnline();
  return postFirstAvailable<AdminDoctorSchedule>([endpoints.clinicAdmin.doctorSchedules(doctorId)], payload);
}

export async function updateAdminDoctorSchedule(doctorId: number | string, scheduleId: number | string, payload: Partial<AdminDoctorSchedulePayload>): Promise<AdminDoctorSchedule> {
  await ensureAdminMutationOnline();
  return patchFirstAvailable<AdminDoctorSchedule>([endpoints.clinicAdmin.doctorSchedule(doctorId, scheduleId)], payload);
}

export async function deactivateAdminDoctorSchedule(doctorId: number | string, scheduleId: number | string): Promise<void> {
  await ensureAdminMutationOnline();
  await apiClient.delete(endpoints.clinicAdmin.doctorSchedule(doctorId, scheduleId));
}

export async function getAdminClinicReport(params?: AdminQueryParams): Promise<AdminReportSummary> {
  return getFirstAvailable<AdminReportSummary>([endpoints.clinicAdmin.clinicReport], params);
}

export async function getAdminFinancialReport(params?: AdminQueryParams): Promise<AdminReportSummary> {
  return getFirstAvailable<AdminReportSummary>([endpoints.clinicAdmin.financialReport], params);
}

export async function getAdminAppointmentsReport(params?: AdminQueryParams): Promise<AdminReportSummary> {
  return getFirstAvailable<AdminReportSummary>([endpoints.clinicAdmin.appointmentsReport], params);
}

export async function getAdminFiscalReadiness(): Promise<AdminFiscalReadiness> {
  return getFirstAvailable<AdminFiscalReadiness>([endpoints.clinicAdmin.fiscalReadiness]);
}

export async function getAdminFiscalRanges(): Promise<AdminFiscalRange[]> {
  const data = await getFirstAvailable<unknown>([endpoints.clinicAdmin.fiscalRanges]);
  return normalizeAdminList<AdminFiscalRange>(data);
}

export async function getAdminAuditLogs(): Promise<AdminAuditLog[]> {
  const data = await getFirstAvailable<unknown>([endpoints.clinicAdmin.auditLogs], { page_size: 8 });
  return normalizeAdminList<AdminAuditLog>(data);
}

export async function getAdminAuditLogsFiltered(params?: AdminQueryParams): Promise<AdminAuditLog[]> {
  const data = await getFirstAvailable<unknown>([endpoints.clinicAdmin.auditLogs], { page_size: 30, ...params });
  return normalizeAdminList<AdminAuditLog>(data);
}

export async function getAdminAccountLocks(params?: AdminQueryParams): Promise<AdminAccountLock[]> {
  const data = await getFirstAvailable<unknown>(['/security/account-locks/'], params);
  return normalizeAdminList<AdminAccountLock>(data);
}

export async function unlockAdminAccountLock(id: number | string): Promise<AdminAccountLock> {
  await ensureAdminMutationOnline();
  return patchFirstAvailable<AdminAccountLock>([`/security/account-locks/${id}/unlock/`]);
}

export async function getAdminSubscription(): Promise<AdminSubscription | null> {
  return getFirstAvailable<AdminSubscription>([endpoints.clinicAdmin.subscription]).catch(() => null);
}

export async function getAdminUsage(): Promise<AdminUsage | null> {
  return getFirstAvailable<AdminUsage>([endpoints.clinicAdmin.usage]).catch(() => null);
}

export function adminUserRole(user: AdminUser) {
  if (typeof user.role === 'string') return user.role;
  if (typeof user.role === 'object') return user.role.nombre ?? user.role.name ?? user.role_nombre ?? 'Sin rol';
  return user.role_nombre ?? 'Sin rol';
}

export function adminUserName(user: AdminUser) {
  return user.nombre_completo ?? user.full_name ?? user.email;
}

export function clinicName(clinic?: AdminClinic | null) {
  return clinic?.nombre ?? clinic?.name ?? 'Clínica';
}

export function clinicEmail(clinic?: AdminClinic | null) {
  return clinic?.correo ?? clinic?.email ?? 'Sin correo registrado';
}

export function clinicPhone(clinic?: AdminClinic | null) {
  return clinic?.telefono ?? clinic?.phone ?? 'Sin teléfono registrado';
}
