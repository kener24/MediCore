import { Badge } from "./Badge";
import type { MedicalOrderPriority, MedicalOrderStatus, PrescriptionStatus } from "../../types/prescription";

export function PrescriptionStatusBadge({ status }: { status: PrescriptionStatus }) {
  if (status === "emitida") return <Badge tone="active">Emitida</Badge>;
  if (status === "anulada") return <Badge tone="inactive">Anulada</Badge>;
  return <Badge tone="role">Borrador</Badge>;
}

export function MedicalOrderStatusBadge({ status }: { status: MedicalOrderStatus }) {
  if (status === "completada") return <Badge tone="active">Completada</Badge>;
  if (status === "cancelada") return <Badge tone="inactive">Cancelada</Badge>;
  return <Badge tone="role">Pendiente</Badge>;
}

export function MedicalOrderPriorityBadge({ priority }: { priority: MedicalOrderPriority }) {
  return <Badge tone={priority === "urgente" || priority === "alta" ? "role" : "neutral"}>{priority}</Badge>;
}
