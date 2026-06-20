import type { User } from '@/features/auth/types/auth.types';

export type ReceptionProfile = User;

export type ReceptionProfileUpdatePayload = {
  first_name?: string;
  last_name?: string;
  nombre_completo?: string;
  phone?: string;
  telefono?: string;
};

export type ReceptionChangePasswordPayload = {
  confirm_password: string;
  current_password: string;
  new_password: string;
};
