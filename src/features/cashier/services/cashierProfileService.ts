import { endpoints } from '@/core/api/endpoints';
import { getFirstAvailable, postFirstAvailable } from '@/features/cashier/services/cashierApiHelpers';
import type { CashierChangePasswordPayload, CashierProfile } from '@/features/cashier/types/cashierProfile.types';
import { logoutService } from '@/features/auth/services/authService';

export async function getCashierProfile(): Promise<CashierProfile> {
  return getFirstAvailable<CashierProfile>(['/cashier/profile/', endpoints.auth.me, '/users/me/']);
}

export async function changeCashierPassword(payload: CashierChangePasswordPayload) {
  return postFirstAvailable([endpoints.auth.changePassword, '/users/change-password/'], payload);
}

export async function logout() {
  await logoutService();
}
