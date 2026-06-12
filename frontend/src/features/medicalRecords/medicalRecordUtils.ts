export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function formatDateOnly(value?: string | null) {
  if (!value) return "Sin fecha";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("es-HN", { dateStyle: "medium" }).format(new Date(year, month - 1, day));
}

export function formatTime(value?: string | null) {
  return value ? value.slice(0, 5) : "--:--";
}

export function roleNameFrom(user: { role_nombre?: string; role?: unknown } | null) {
  if (!user) return "";
  return user.role_nombre ?? (typeof user.role === "object" && user.role && "nombre" in user.role ? String(user.role.nombre) : "");
}

export function consultationListPath(roleName: string) {
  return roleName === "medico" ? "/doctor/consultations" : "/clinic/consultations";
}
