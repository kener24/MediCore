import api from "./axios";
import type { AuthResponse, LoginPayload, MeResponse } from "../types/auth";
import type { User } from "../types/user";

export async function login(payload: LoginPayload) {
  const { data } = await api.post<AuthResponse>("/auth/login/", payload);
  return data;
}

export async function getMe() {
  const { data } = await api.get<MeResponse>("/auth/me/");
  return data;
}

export async function updateMe(payload: Pick<User, "nombre_completo" | "telefono" | "avatar_url">) {
  const { data } = await api.patch<MeResponse>("/auth/me/", payload);
  return data;
}

export async function changePassword(payload: { old_password: string; new_password: string }) {
  const { data } = await api.post<{ detail: string }>("/auth/change-password/", payload);
  return data;
}
