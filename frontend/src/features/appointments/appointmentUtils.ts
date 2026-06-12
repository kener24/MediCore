import type { AppointmentStatus } from "../../types/appointment";

export const appointmentStatusOptions: Array<{ label: string; value: AppointmentStatus | "" }> = [
  { label: "Estado", value: "" },
  { label: "Pendiente", value: "pendiente" },
  { label: "Confirmada", value: "confirmada" },
  { label: "Atendida", value: "atendida" },
  { label: "Cancelada", value: "cancelada" },
  { label: "No asistio", value: "no_asistio" },
  { label: "Reprogramada", value: "reprogramada" },
];

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

export function listPathForRole(roleName: string) {
  if (roleName === "medico") return "/doctor/appointments";
  if (roleName === "paciente") return "/patient/appointments";
  if (roleName === "superadmin") return "/superadmin/appointments";
  return "/clinic/appointments";
}
