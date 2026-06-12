import { Badge } from "./Badge";
import type { CashStatus, InvoiceStatus, PaymentMethod, PaymentStatus } from "../../types/billing";

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  if (status === "pagada") return <Badge tone="active">Pagada</Badge>;
  if (status === "anulada") return <Badge tone="inactive">Anulada</Badge>;
  if (status === "parcialmente_pagada") return <Badge tone="role">Parcial</Badge>;
  return <Badge>{status}</Badge>;
}
export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge tone={status === "aplicado" ? "active" : "inactive"}>{status}</Badge>;
}
export function PaymentMethodBadge({ method }: { method: PaymentMethod }) {
  return <Badge tone="neutral">{method}</Badge>;
}
export function CashStatusBadge({ status }: { status: CashStatus }) {
  return <Badge tone={status === "abierta" ? "active" : "inactive"}>{status}</Badge>;
}
