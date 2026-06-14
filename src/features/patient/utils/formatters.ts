export function formatDate(value?: string | null, mode: 'default' | 'shortDay' = 'default') {
  if (!value) return 'Fecha no indicada';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-HN', {
    day: '2-digit',
    month: mode === 'shortDay' ? 'short' : 'long',
    year: mode === 'shortDay' ? undefined : 'numeric',
  }).format(date);
}

export function formatTime(value?: string | null) {
  if (!value) return 'Hora no indicada';
  return value.slice(0, 5);
}

export function formatCurrency(value?: string | number | null) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat('es-HN', {
    currency: 'HNL',
    style: 'currency',
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function getAppointmentTone(status?: string) {
  if (status === 'confirmada' || status === 'atendida') return 'success';
  if (status === 'pendiente' || status === 'reprogramada') return 'warning';
  if (status === 'cancelada' || status === 'no_asistio') return 'danger';
  return 'neutral';
}

export function getInvoiceTone(status?: string) {
  if (status === 'pagada') return 'success';
  if (status === 'pendiente' || status === 'parcialmente_pagada') return 'warning';
  if (status === 'anulada') return 'danger';
  return 'neutral';
}
