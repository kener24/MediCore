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

export function resolveSupportedAppRole(role?: RoleName | null): AppRole | null {
  const normalized = normalizeRole(role);
  if (normalized === 'doctor') return 'medico';
  if (isNurseRole(normalized)) return 'enfermera';
  if (isReceptionRole(normalized)) return 'recepcionista';
  if (['paciente', 'medico', 'admin'].includes(normalized)) {
    return normalized as AppRole;
  }
  return null;
}
