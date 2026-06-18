import { apiClient } from '@/core/api/apiClient';
import { endpoints } from '@/core/api/endpoints';
import { getMeService, logoutService } from '@/features/auth/services/authService';
import { getFirstAvailable, patchFirstAvailable, postFirstAvailable } from '@/features/doctor/services/doctorApiHelpers';
import { normalizeListResponse, type ApiListResponse } from '@/features/doctor/types/commonDoctor.types';
import type {
  ChangePasswordPayload,
  DoctorActivitySummary,
  DoctorProfile,
  DoctorProfileUpdatePayload,
  DoctorScheduleItem,
} from '@/features/doctor/types/doctorProfile.types';

const profileUnavailable = 'El perfil médico aún no está disponible completamente.';

export async function getDoctorProfile() {
  try {
    return await getFirstAvailable<DoctorProfile>([endpoints.doctor.profile, endpoints.doctor.profileAlt]);
  } catch {
    return getMeService() as Promise<DoctorProfile>;
  }
}

export async function updateDoctorProfile(payload: DoctorProfileUpdatePayload) {
  try {
    return await patchFirstAvailable<DoctorProfile>(
      [endpoints.doctor.profile, endpoints.doctor.profileAlt, endpoints.auth.me],
      normalizeProfilePayload(payload),
    );
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
    ]);
    return normalizeListResponse(data);
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
