export function homePathForRole(roleName?: string) {
  if (roleName === "superadmin") return "/superadmin/dashboard";
  if (roleName === "admin") return "/clinic/dashboard";
  if (roleName === "medico") return "/doctor/dashboard";
  if (roleName === "paciente") return "/patient/dashboard";
  return "/dashboard";
}

export function roleNameFromUser(user: { role_nombre?: string; role?: unknown } | null | undefined) {
  if (!user) return "";
  if (user.role_nombre) return user.role_nombre;
  if (typeof user.role === "object" && user.role && "nombre" in user.role) {
    return String(user.role.nombre);
  }
  return "";
}
