import type { User } from '@/features/auth/types/auth.types';

export type CashierProfile = User & {
  last_login?: string | null;
};

export type CashierChangePasswordPayload = {
  confirm_password: string;
  current_password: string;
  new_password: string;
};
