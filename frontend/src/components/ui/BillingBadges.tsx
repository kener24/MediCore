import { Badge } from "./Badge";
import type { CashStatus, InvoiceStatus, PaymentMethod, PaymentStatus } from "../../types/billing";

const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  borrador: "Borrador",
  pendiente: "Pendiente",
  parcialmente_pagada: "Pago parcial",
  pagada: "Pagada",
  anulada: "Anulada",
};

const paymentStatusLabels: Record<PaymentStatus, string> = {
  aplicado: "Aplicado",
  anulado: "Anulado",
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  deposito: "Depósito",
  cheque: "Cheque",
  otro: "Otro",
};

const cashStatusLabels: Record<CashStatus, string> = {
  abierta: "Abierta",
  cerrada: "Cerrada",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  if (status === "pagada") return <Badge tone="active">{invoiceStatusLabels[status]}</Badge>;
  if (status === "anulada") return <Badge tone="inactive">{invoiceStatusLabels[status]}</Badge>;
  if (status === "parcialmente_pagada") return <Badge tone="role">{invoiceStatusLabels[status]}</Badge>;
  return <Badge>{invoiceStatusLabels[status]}</Badge>;
}
export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge tone={status === "aplicado" ? "active" : "inactive"}>{paymentStatusLabels[status]}</Badge>;
}
export function PaymentMethodBadge({ method }: { method: PaymentMethod }) {
  return <Badge tone="neutral">{paymentMethodLabels[method]}</Badge>;
}
export function CashStatusBadge({ status }: { status: CashStatus }) {
  return <Badge tone={status === "abierta" ? "active" : "inactive"}>{cashStatusLabels[status]}</Badge>;
}
