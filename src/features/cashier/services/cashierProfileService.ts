import { endpoints } from '@/core/api/endpoints';
import { changePasswordService, logoutService } from '@/features/auth/services/authService';
import { getFirstAvailable } from '@/features/cashier/services/cashierApiHelpers';
import type { CashierChangePasswordPayload, CashierProfile } from '@/features/cashier/types/cashierProfile.types';

export async function getCashierProfile(): Promise<CashierProfile> {
  return getFirstAvailable<CashierProfile>(['/cashier/profile/', endpoints.auth.me, '/users/me/']);
}

export async function changeCashierPassword(payload: CashierChangePasswordPayload) {
  return changePasswordService(payload);
}

export async function logout() {
  await logoutService();
}
