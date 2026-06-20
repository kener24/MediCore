import { StyleSheet, Text } from 'react-native';

import { colors } from '@/core/theme/colors';

export function invoiceStatusLabel(status?: string) {
  const value = String(status ?? '').toLowerCase();
  if (['paid', 'pagada'].includes(value)) return 'Pagada';
  if (['partial', 'partially_paid', 'parcial', 'parcialmente_pagada'].includes(value)) return 'Parcial';
  if (['cancelled', 'canceled', 'void', 'cancelada', 'anulada'].includes(value)) return 'Cancelada';
  if (['draft', 'borrador'].includes(value)) return 'Borrador';
  return 'Pendiente';
}

export function canPayInvoice(status?: string) {
  const value = String(status ?? '').toLowerCase();
  return !['paid', 'pagada', 'cancelled', 'canceled', 'void', 'cancelada', 'anulada'].includes(value);
}

export function InvoiceStatusBadge({ status }: { status?: string }) {
  const label = invoiceStatusLabel(status);
  return <Text style={[styles.badge, styles[label] ?? styles.Pendiente]}>{label}</Text>;
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', borderRadius: 999, fontSize: 12, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 5 },
  Borrador: { backgroundColor: '#f1f5f9', color: colors.muted },
  Cancelada: { backgroundColor: '#fee2e2', color: colors.danger },
  Pagada: { backgroundColor: '#dcfce7', color: '#15803d' },
  Parcial: { backgroundColor: '#fef3c7', color: '#92400e' },
  Pendiente: { backgroundColor: '#dbeafe', color: '#1d4ed8' },
});
