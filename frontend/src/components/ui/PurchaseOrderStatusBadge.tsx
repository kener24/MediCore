import { Badge } from "./Badge";
import type { PurchaseOrderStatus } from "../../types/purchase";

const labels: Record<PurchaseOrderStatus, string> = {
  borrador: "Borrador",
  pendiente: "Pendiente",
  aprobada: "Aprobada",
  recibida_parcial: "Recibida parcial",
  recibida: "Recibida",
  cancelada: "Cancelada",
};

export function PurchaseOrderStatusBadge({ status }: { status: PurchaseOrderStatus }) {
  const tone = status === "cancelada" ? "inactive" : status === "recibida" || status === "aprobada" ? "active" : "neutral";
  return <Badge tone={tone}>{labels[status] ?? status}</Badge>;
}
