import { getFirstAvailable } from '@/features/reception/services/receptionApiHelpers';
import type { ReceptionProfile } from '@/features/reception/types/receptionProfile.types';

export async function getReceptionProfile(): Promise<ReceptionProfile> {
  return getFirstAvailable<ReceptionProfile>(['/reception/profile/', '/auth/me/']);
}
