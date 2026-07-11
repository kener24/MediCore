import { endpoints } from '@/core/api/endpoints';
import { getFirstAvailable, normalizeAdminList, postFirstAvailable, type AdminQueryParams } from '@/features/admin/services/adminApiHelpers';
import type {
  AdminAuditLog,
  AdminClinic,
  AdminDashboard,
  AdminFiscalRange,
  AdminFiscalReadiness,
  AdminReportSummary,
  AdminSpecialty,
  AdminSubscription,
  AdminUsage,
  AdminUser,
  CreateClinicUserPayload,
  CreateDoctorProfilePayload,
} from '@/features/admin/types/admin.types';

export async function getAdminDashboard(): Promise<AdminDashboard> {
  return getFirstAvailable<AdminDashboard>([endpoints.clinicAdmin.dashboard, endpoints.clinicAdmin.clinicReport]);
}

export async function getAdminClinic(): Promise<AdminClinic> {
  return getFirstAvailable<AdminClinic>([endpoints.clinicAdmin.myClinic]);
}

export async function getAdminUsers(params?: AdminQueryParams): Promise<AdminUser[]> {
  const data = await getFirstAvailable<unknown>([endpoints.clinicAdmin.users, '/users/'], params);
  return normalizeAdminList<AdminUser>(data);
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

export async function createClinicStaff(payload: CreateClinicUserPayload, doctorProfile?: Omit<CreateDoctorProfilePayload, 'user'>): Promise<AdminUser> {
  return postFirstAvailable<AdminUser>([endpoints.clinicAdmin.createStaff], {
    ...payload,
    doctor_profile: doctorProfile,
  });
}

export async function getAdminClinicReport(params?: AdminQueryParams): Promise<AdminReportSummary> {
  return getFirstAvailable<AdminReportSummary>([endpoints.clinicAdmin.clinicReport], params);
}

export async function getAdminFinancialReport(params?: AdminQueryParams): Promise<AdminReportSummary> {
  return getFirstAvailable<AdminReportSummary>([endpoints.clinicAdmin.financialReport], params);
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
