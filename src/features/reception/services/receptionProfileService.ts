import { endpoints } from '@/core/api/endpoints';
import { changePasswordService } from '@/features/auth/services/authService';
import { getFirstAvailable, patchFirstAvailable } from '@/features/reception/services/receptionApiHelpers';
import type {
  ReceptionChangePasswordPayload,
  ReceptionProfile,
  ReceptionProfileUpdatePayload,
} from '@/features/reception/types/receptionProfile.types';

export async function getReceptionProfile(): Promise<ReceptionProfile> {
  const data = await getFirstAvailable<unknown>(['/reception/profile/', endpoints.auth.me, '/users/me/']);
  return mapReceptionProfile(data);
}

export async function updateReceptionProfile(payload: ReceptionProfileUpdatePayload): Promise<ReceptionProfile> {
  const data = await patchFirstAvailable<unknown>(
    ['/reception/profile/', endpoints.auth.me, '/users/me/'],
    normalizeProfilePayload(payload),
  );
  return mapReceptionProfile(data);
}

export async function changeReceptionPassword(payload: ReceptionChangePasswordPayload) {
  return changePasswordService(payload);
}

function mapReceptionProfile(response: unknown): ReceptionProfile {
  const root = asRecord(response);
  const user = firstRecord(root.user, root.usuario, root.profile, root.account) ?? root;
  const clinic = firstRecord(root.clinica, root.clinic, user.clinica, user.clinic);
  const role = user.role ?? user.role_nombre ?? root.role ?? root.role_nombre;
  return {
    avatar_url: stringValue(user.avatar_url, root.avatar_url),
    clinica: clinic ? { id: numberValue(clinic.id) ?? 0, nombre: stringValue(clinic.nombre, clinic.name) ?? 'No asignada' } : null,
    clinica_nombre: stringValue(user.clinica_nombre, root.clinica_nombre, clinic?.nombre, clinic?.name),
    email: stringValue(user.email, root.email) ?? '',
    id: numberValue(user.id, root.id) ?? 0,
    is_active: booleanValue(user.is_active, root.is_active) ?? true,
    is_staff: booleanValue(user.is_staff, root.is_staff) ?? false,
    is_superuser: booleanValue(user.is_superuser, root.is_superuser) ?? false,
    nombre_completo:
      stringValue(user.nombre_completo, root.nombre_completo, user.full_name, root.full_name) ??
      joinName(stringValue(user.first_name, root.first_name), stringValue(user.last_name, root.last_name)) ??
      stringValue(user.email, root.email) ??
      'Recepción',
    role: normalizeRole(role),
    role_nombre: stringValue(user.role_nombre, root.role_nombre, roleName(role)) ?? 'recepcionista',
    telefono: stringValue(user.telefono, user.phone, root.telefono, root.phone),
  };
}

function normalizeProfilePayload(payload: ReceptionProfileUpdatePayload) {
  const nombreCompleto = payload.nombre_completo ?? joinName(payload.first_name, payload.last_name);
  return {
    ...payload,
    nombre_completo: nombreCompleto,
    phone: payload.phone ?? payload.telefono,
    telefono: payload.telefono ?? payload.phone,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function firstRecord(...values: unknown[]) {
  for (const value of values) {
    const record = asRecord(value);
    if (Object.keys(record).length) return record;
  }
  return null;
}

function stringValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return undefined;
}

function numberValue(...values: unknown[]) {
  for (const value of values) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }
  return undefined;
}

function booleanValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'boolean') return value;
  }
  return undefined;
}

function joinName(first?: string, last?: string) {
  return [first, last].filter(Boolean).join(' ').trim() || undefined;
}

function roleName(value: unknown) {
  if (typeof value === 'string') return value;
  const record = asRecord(value);
  return stringValue(record.nombre, record.name);
}

function normalizeRole(value: unknown) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return { id: 0, nombre: value };
  const record = asRecord(value);
  return Object.keys(record).length ? { id: numberValue(record.id) ?? 0, nombre: stringValue(record.nombre, record.name) ?? 'recepcionista' } : { id: 0, nombre: 'recepcionista' };
}
