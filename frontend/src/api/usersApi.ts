import api from "./axios";
import type { User, UserPayload } from "../types/user";

export interface UserFilters {
  search?: string;
  clinic?: string;
  role?: string;
  is_active?: string;
}

export async function getUsers(filters?: UserFilters) {
  const { data } = await api.get<User[]>("/users/", { params: filters });
  return data;
}

export async function getUser(id: string | number) {
  const { data } = await api.get<User>(`/users/${id}/`);
  return data;
}

export async function createUser(payload: UserPayload) {
  const { data } = await api.post<User>("/users/", payload);
  return data;
}

export async function updateUser(id: string | number, payload: Partial<UserPayload>) {
  const { data } = await api.patch<User>(`/users/${id}/`, payload);
  return data;
}

export async function deactivateUser(id: string | number) {
  const { data } = await api.patch<User>(`/users/${id}/deactivate/`);
  return data;
}

export async function activateUser(id: string | number) {
  const { data } = await api.patch<User>(`/users/${id}/activate/`);
  return data;
}
