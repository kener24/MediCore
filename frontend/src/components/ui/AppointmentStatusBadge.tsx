import { Badge } from "./Badge";
import type { AppointmentStatus } from "../../types/appointment";

const labels: Record<AppointmentStatus, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
  atendida: "Atendida",
  no_asistio: "No asistio",
  reprogramada: "Reprogramada",
};

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  if (status === "confirmada" || status === "atendida") return <Badge tone="active">{labels[status]}</Badge>;
  if (status === "cancelada" || status === "no_asistio") return <Badge tone="inactive">{labels[status]}</Badge>;
  if (status === "reprogramada") return <Badge tone="role">{labels[status]}</Badge>;
  return <Badge>{labels[status] ?? status}</Badge>;
}
