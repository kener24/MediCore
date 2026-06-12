import { Badge } from "./Badge";
import type { InventoryItemType, InventoryMovementType } from "../../types/inventory";

export function InventoryTypeBadge({ type }: { type: InventoryItemType }) {
  return <Badge tone={type === "medicamento" ? "role" : "neutral"}>{type}</Badge>;
}

export function StockBadge({ low }: { low: boolean }) {
  return <Badge tone={low ? "inactive" : "active"}>{low ? "Bajo stock" : "Stock OK"}</Badge>;
}

export function MovementTypeBadge({ type }: { type: InventoryMovementType }) {
  const negative = ["salida", "ajuste_negativo", "perdida", "vencimiento"].includes(type);
  return <Badge tone={negative ? "inactive" : "active"}>{type}</Badge>;
}
