import { endpoints } from '@/core/api/endpoints';
import { getFirstAvailable, normalizeAdminList, patchFirstAvailable, postFirstAvailable, type AdminQueryParams } from '@/features/admin/services/adminApiHelpers';
import type {
  AdminAuditLog,
  AdminAccountLock,
  AdminClinic,
  AdminDashboard,
  AdminDoctorProfile,
  AdminFiscalRange,
  AdminFiscalReadiness,
  AdminReportSummary,
  AdminRolePermissions,
  AdminSpecialty,
  AdminSubscription,
  AdminUsage,
  AdminUser,
  CreateClinicUserPayload,
  CreateDoctorProfilePayload,
  UpdateAdminClinicPayload,
  UpdateAdminDoctorProfilePayload,
  UpdateAdminUserPayload,
} from '@/features/admin/types/admin.types';

export async function getAdminDashboard(): Promise<AdminDashboard> {
  return getFirstAvailable<AdminDashboard>([endpoints.clinicAdmin.dashboard, endpoints.clinicAdmin.clinicReport]);
}

export async function getAdminClinic(): Promise<AdminClinic> {
  return getFirstAvailable<AdminClinic>([endpoints.clinicAdmin.myClinic]);
}

export async function updateAdminClinic(payload: UpdateAdminClinicPayload): Promise<AdminClinic> {
  return patchFirstAvailable<AdminClinic>([endpoints.clinicAdmin.myClinic], payload);
}

export async function getAdminUsers(params?: AdminQueryParams): Promise<AdminUser[]> {
  const data = await getFirstAvailable<unknown>([endpoints.clinicAdmin.users, '/users/'], params);
  return normalizeAdminList<AdminUser>(data);
}

export async function getAdminUser(id: number | string): Promise<AdminUser> {
  return getFirstAvailable<AdminUser>([endpoints.clinicAdmin.user(id)]);
}

export async function updateAdminUser(id: number | string, payload: UpdateAdminUserPayload): Promise<AdminUser> {
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
  return postFirstAvailable<AdminUser>([endpoints.clinicAdmin.users], payload);
}

export async function createDoctorProfile(payload: CreateDoctorProfilePayload) {
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
  return patchFirstAvailable<AdminDoctorProfile>([`${endpoints.clinicAdmin.doctors}${id}/`], payload);
}

export async function createClinicStaff(payload: CreateClinicUserPayload, doctorProfile?: Omit<CreateDoctorProfilePayload, 'user'>): Promise<AdminUser> {
  return postFirstAvailable<AdminUser>([endpoints.clinicAdmin.createStaff], {
    ...payload,
    doctor_profile: doctorProfile,
  });
}

export async function setAdminUserActive(id: number | string, active: boolean, reason?: string): Promise<AdminUser> {
  return patchFirstAvailable<AdminUser>([active ? endpoints.clinicAdmin.activateUser(id) : endpoints.clinicAdmin.deactivateUser(id)], reason ? { reason } : undefined);
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
  return patchFirstAvailable<AdminAccountLock>([`/security/account-locks/${id}/unlock/`]);
}

export async function requestAdminPasswordReset(email: string): Promise<void> {
  await postFirstAvailable(['/security/password-reset/request/'], { email });
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
