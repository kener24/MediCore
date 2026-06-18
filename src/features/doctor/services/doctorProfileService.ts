import { apiClient } from '@/core/api/apiClient';
import { endpoints } from '@/core/api/endpoints';
import { logoutService } from '@/features/auth/services/authService';
import { getFirstAvailable, patchFirstAvailable, postFirstAvailable } from '@/features/doctor/services/doctorApiHelpers';
import { normalizeListResponse, type ApiListResponse } from '@/features/doctor/types/commonDoctor.types';
import type {
  ChangePasswordPayload,
  DoctorActivitySummary,
  DoctorClinicInfo,
  DoctorProfessionalInfo,
  DoctorProfile,
  DoctorProfileUpdatePayload,
  DoctorScheduleItem,
} from '@/features/doctor/types/doctorProfile.types';

const profileUnavailable = 'El perfil médico aún no está disponible completamente.';

type AnyRecord = Record<string, unknown>;

const profileEndpoints = [
  endpoints.auth.me,
  '/users/me/',
  endpoints.doctor.profile,
  endpoints.doctor.profileAlt,
  '/api/auth/me/',
  '/api/doctor/profile/',
];

export async function getDoctorProfile() {
  let baseProfile: unknown = null;
  try {
    baseProfile = await getFirstAvailable<unknown>([endpoints.auth.me, '/users/me/', '/api/auth/me/']);
  } catch {
    baseProfile = null;
  }

  try {
    const doctorProfile = await getFirstAvailable<unknown>([
      endpoints.doctor.profile,
      endpoints.doctor.profileAlt,
      '/api/doctor/profile/',
    ]);
    return mapDoctorProfileResponse({ user: baseProfile, doctor: doctorProfile, profile: doctorProfile });
  } catch {
    if (baseProfile) return mapDoctorProfileResponse(baseProfile);
  }

  const data = await getFirstAvailable<unknown>(profileEndpoints);
  return mapDoctorProfileResponse(data);
}

export async function updateDoctorProfile(payload: DoctorProfileUpdatePayload) {
  try {
    const data = await patchFirstAvailable<unknown>(
      [endpoints.doctor.profile, endpoints.doctor.profileAlt, endpoints.auth.me, '/users/me/'],
      normalizeProfilePayload(payload),
    );
    return mapDoctorProfileResponse(data);
  } catch (err) {
    throw err instanceof Error ? err : new Error('No se pudo actualizar el perfil.');
  }
}

export async function changePassword(payload: ChangePasswordPayload) {
  return postFirstAvailable(
    [endpoints.auth.changePassword, '/users/change-password/'],
    payload,
  );
}

export async function getDoctorSchedule() {
  try {
    const data = await getFirstAvailable<ApiListResponse<DoctorScheduleItem>>([
      endpoints.doctor.schedules,
      endpoints.doctor.schedulesAlt,
      '/api/doctor/schedules/',
    ]);
    return normalizeListResponse(data).map(mapDoctorScheduleItem);
  } catch {
    return [];
  }
}

export async function getDoctorActivitySummary() {
  try {
    const { data } = await apiClient.get<DoctorActivitySummary>(endpoints.doctor.activitySummary);
    return data;
  } catch {
    return null;
  }
}

export async function logout() {
  await logoutService();
}

export function mapDoctorProfileResponse(response: unknown): DoctorProfile {
  const root = asRecord(response);
  const user = firstRecord(root.user, root.usuario, root.account, root.auth_user) ?? root;
  const doctor =
    firstRecord(root.doctor, root.medico, root.doctor_profile, root.profile, root.professional, user.doctor_profile, user.profile) ??
    {};
  const clinic = firstRecord(root.clinic, root.clinica, user.clinic, user.clinica, doctor.clinic, doctor.clinica);
  const role = root.role ?? root.role_nombre ?? user.role ?? user.role_nombre ?? doctor.role ?? doctor.role_nombre;
  const schedules = firstArray(root.schedules, root.horarios, doctor.schedules, doctor.horarios);

  const professional = mapProfessionalInfo(doctor, root);
  const fullName =
    stringValue(root.full_name, root.nombre_completo, user.full_name, user.nombre_completo, doctor.full_name, doctor.nombre_completo, doctor.user_nombre) ||
    joinName(
      stringValue(root.first_name, user.first_name, doctor.first_name),
      stringValue(root.last_name, user.last_name, doctor.last_name),
    );

  return {
    avatar_url: stringValue(root.avatar_url, user.avatar_url, doctor.avatar_url) || null,
    clinic: clinic ? mapClinicInfo(clinic) : null,
    clinic_name: stringValue(root.clinic_name, root.clinica_nombre, user.clinic_name, user.clinica_nombre, doctor.clinic_name, doctor.clinica_nombre),
    clinica: clinic ? mapClinicInfo(clinic) : null,
    clinica_nombre: stringValue(root.clinica_nombre, root.clinic_name, user.clinica_nombre, user.clinic_name, doctor.clinica_nombre, doctor.clinic_name),
    created_at: stringValue(root.created_at, root.creado_en, user.created_at, user.creado_en, doctor.created_at, doctor.creado_en),
    email: stringValue(root.email, user.email, doctor.email, doctor.user_email),
    especialidad_nombre: stringValue(root.especialidad_nombre, doctor.especialidad_nombre, doctor.specialty_nombre, root.specialty_name, doctor.specialty_name, professional?.specialty),
    first_name: stringValue(root.first_name, user.first_name, doctor.first_name),
    full_name: fullName || stringValue(root.email, user.email, doctor.email) || 'Médico',
    id: numberValue(doctor.id, root.id, user.id),
    is_active: booleanValue(root.is_active, user.is_active, doctor.is_active, root.activo, doctor.activo),
    last_login: stringValue(root.last_login, user.last_login, doctor.last_login) || null,
    last_name: stringValue(root.last_name, user.last_name, doctor.last_name),
    nombre_completo: fullName || stringValue(root.email, user.email, doctor.email) || 'Médico',
    phone: stringValue(root.phone, root.telefono, user.phone, user.telefono, doctor.phone, doctor.telefono, doctor.user_telefono),
    professional,
    role: normalizeRole(role),
    role_nombre: stringValue(root.role_nombre, user.role_nombre, doctor.role_nombre) || roleName(role),
    schedules: schedules.map(mapDoctorScheduleItem),
    specialty_name: stringValue(root.specialty_name, doctor.specialty_name, doctor.specialty_nombre, root.especialidad_nombre, doctor.especialidad_nombre, professional?.specialty),
    telefono: stringValue(root.telefono, root.phone, user.telefono, user.phone, doctor.telefono, doctor.phone, doctor.user_telefono),
    user_id: numberValue(root.user_id, doctor.user_id, user.id),
  };
}

function mapClinicInfo(value: AnyRecord): DoctorClinicInfo {
  return {
    address: stringValue(value.address, value.direccion),
    correo: stringValue(value.correo, value.email),
    direccion: stringValue(value.direccion, value.address),
    email: stringValue(value.email, value.correo),
    id: numberValue(value.id),
    name: stringValue(value.name, value.nombre, value.clinic_name, value.razon_social),
    nombre: stringValue(value.nombre, value.name, value.clinic_name, value.razon_social),
    phone: stringValue(value.phone, value.telefono),
    telefono: stringValue(value.telefono, value.phone),
  };
}

function mapProfessionalInfo(doctor: AnyRecord, root: AnyRecord): DoctorProfessionalInfo | null {
  const specialty = firstRecord(doctor.specialty, doctor.especialidad, root.specialty, root.especialidad);
  const info: DoctorProfessionalInfo = {
    biography: stringValue(doctor.biography, doctor.biografia, root.biography, root.biografia),
    biografia: stringValue(doctor.biografia, doctor.biography, root.biografia, root.biography),
    consultation_duration_minutes: numberOrString(doctor.consultation_duration_minutes, doctor.duracion_consulta, doctor.duracion_consulta_minutos),
    consultation_fee: numberOrString(doctor.consultation_fee, doctor.tarifa_consulta),
    duracion_consulta: numberOrString(doctor.duracion_consulta, doctor.duracion_consulta_minutos, doctor.consultation_duration_minutes),
    especialidad: stringValue(doctor.especialidad_nombre, doctor.specialty_nombre, doctor.especialidad, doctor.titulo_profesional, specialty?.nombre, specialty?.name),
    id: numberValue(doctor.id),
    license_number: stringValue(doctor.license_number, doctor.numero_colegiacion, doctor.professional_code),
    numero_colegiacion: stringValue(doctor.numero_colegiacion, doctor.license_number, doctor.professional_code),
    professional_code: stringValue(doctor.professional_code, doctor.numero_colegiacion, doctor.license_number),
    specialty: stringValue(doctor.specialty_name, doctor.especialidad_nombre, doctor.specialty_nombre, doctor.titulo_profesional, specialty?.name, specialty?.nombre),
    sub_specialty: stringValue(doctor.sub_specialty, doctor.subespecialidad),
    subespecialidad: stringValue(doctor.subespecialidad, doctor.sub_specialty),
    tarifa_consulta: numberOrString(doctor.tarifa_consulta, doctor.consultation_fee),
  };
  return Object.values(info).some((value) => value !== undefined && value !== '') ? info : null;
}

function mapDoctorScheduleItem(value: DoctorScheduleItem): DoctorScheduleItem {
  const item = asRecord(value);
  return {
    day_label: stringValue(item.day_label, item.day_of_week, item.dia, item.dia_semana),
    day_of_week: stringValue(item.day_of_week, item.day_label, item.dia, item.dia_semana),
    dia: stringValue(item.dia, item.dia_semana, item.day_label, item.day_of_week),
    end_time: stringValue(item.end_time, item.hora_fin),
    hora_fin: stringValue(item.hora_fin, item.end_time),
    hora_inicio: stringValue(item.hora_inicio, item.start_time),
    id: numberValue(item.id),
    is_active: booleanValue(item.is_active, item.activo),
    start_time: stringValue(item.start_time, item.hora_inicio),
  };
}

function normalizeProfilePayload(payload: DoctorProfileUpdatePayload) {
  return {
    ...payload,
    telefono: payload.phone ?? payload.telefono,
    biografia: payload.biography ?? payload.biografia,
  };
}

export function profileFallbackMessage() {
  return profileUnavailable;
}

function asRecord(value: unknown): AnyRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as AnyRecord) : {};
}

function firstRecord(...values: unknown[]) {
  for (const value of values) {
    const record = asRecord(value);
    if (Object.keys(record).length) return record;
  }
  return null;
}

function firstArray(...values: unknown[]) {
  for (const value of values) {
    if (Array.isArray(value)) return value as DoctorScheduleItem[];
  }
  return [];
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

function numberOrString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) return value.trim();
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
  if (typeof value === 'string' || typeof value === 'number') return value;
  const record = asRecord(value);
  return Object.keys(record).length ? { nombre: stringValue(record.nombre, record.name) } : undefined;
}
