import type { AppRole, RoleName } from '@/features/auth/types/auth.types';

export function normalizeRole(role?: RoleName | null) {
  return String(role ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .trim();
}

export function isNurseRole(role?: RoleName | null) {
  return ['enfermera', 'enfermero', 'enfermeria', 'nurse', 'nursing'].includes(normalizeRole(role));
}

export function isReceptionRole(role?: RoleName | null) {
  return ['recepcionista', 'recepcion', 'receptionist', 'front desk', 'admisiones', 'admissions'].includes(normalizeRole(role));
}

export function isCashierRole(role?: RoleName | null, permissions?: string[] | null) {
  const normalized = normalizeRole(role);
  const normalizedPermissions = (permissions ?? []).map((permission) => normalizeRole(permission));
  if (['cajero', 'caja', 'cashier', 'billing', 'billing staff', 'recepcion caja', 'recepcionista caja'].includes(normalized)) return true;
  if (['paciente', 'medico', 'doctor', 'enfermera', 'enfermero', 'enfermeria', 'nurse', 'nursing', 'superadmin'].includes(normalized)) return false;
  return normalizedPermissions.some((permission) => ['cashier', 'caja', 'billing', 'billing staff', 'payments', 'pagos'].includes(permission));
}

export function resolveSupportedAppRole(role?: RoleName | null): AppRole | null {
  const normalized = normalizeRole(role);
  if (normalized === 'doctor') return 'medico';
  if (isNurseRole(normalized)) return 'enfermera';
  if (isCashierRole(normalized)) return 'cajero';
  if (isReceptionRole(normalized)) return 'recepcionista';
  if (['paciente', 'medico', 'admin'].includes(normalized)) {
    return normalized as AppRole;
  }
  return null;
}
