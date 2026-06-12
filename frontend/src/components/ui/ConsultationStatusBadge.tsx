import { Badge } from "./Badge";
import type { ConsultationStatus } from "../../types/medicalRecord";

const labels: Record<ConsultationStatus, string> = {
  borrador: "Borrador",
  finalizada: "Finalizada",
  anulada: "Anulada",
};

export function ConsultationStatusBadge({ status }: { status: ConsultationStatus }) {
  if (status === "finalizada") return <Badge tone="active">{labels[status]}</Badge>;
  if (status === "anulada") return <Badge tone="inactive">{labels[status]}</Badge>;
  return <Badge tone="role">{labels[status]}</Badge>;
}
