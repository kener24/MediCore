import { endpoints } from '@/core/api/endpoints';
import { getMeService } from '@/features/auth/services/authService';
import { getFirstAvailable } from '@/features/doctor/services/doctorApiHelpers';
import type { DoctorProfile } from '@/features/doctor/types/doctorProfile.types';

export async function getDoctorProfile() {
  try {
    return await getFirstAvailable<DoctorProfile>([endpoints.doctor.profile]);
  } catch {
    return getMeService() as Promise<DoctorProfile>;
  }
}
