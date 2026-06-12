import type { User } from "./user";

export interface AuthResponse {
  access: string;
  refresh: string;
  session_key?: string;
  user?: User;
}

export type MeResponse = User;

export interface LoginPayload {
  email: string;
  password: string;
}
