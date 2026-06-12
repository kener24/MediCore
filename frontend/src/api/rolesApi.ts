import api from "./axios";
import type { Role } from "../types/role";

export async function getRoles() {
  const { data } = await api.get<Role[]>("/roles/");
  return data;
}
