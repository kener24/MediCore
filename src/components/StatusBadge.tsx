import { StyleSheet, Text } from 'react-native';

import { colors } from '@/core/theme/colors';

const labels: Record<string, string> = {
  active: 'Activa',
  administered: 'Administrado',
  anulada: 'Anulada',
  borrador: 'Borrador',
  cancelled: 'Cancelada',
  completed: 'Finalizada',
  draft: 'Borrador',
  emitida: 'Activa',
  expired: 'Vencida',
  paid: 'Pagada',
  pagada: 'Pagada',
  parcial: 'Parcial',
  parcialmente_pagada: 'Parcial',
  partially_paid: 'Parcial',
  pending: 'Pendiente',
  pendiente: 'Pendiente',
  delayed: 'Retrasado',
  omitted: 'Omitido',
  void: 'Anulada',
};

function styleFor(status?: string) {
  if (!status) return styles.neutral;
  if (['active', 'administered', 'emitida', 'paid', 'pagada', 'completed'].includes(status)) return styles.success;
  if (['pending', 'pendiente', 'delayed', 'partially_paid', 'parcialmente_pagada', 'parcial', 'draft', 'borrador'].includes(status)) return styles.warning;
  if (['cancelled', 'cancelada', 'anulada', 'void', 'expired', 'omitted'].includes(status)) return styles.danger;
  return styles.neutral;
}

export function StatusBadge({ label, status }: { label?: string; status?: string }) {
  return <Text style={[styles.badge, styleFor(status)]}>{label ?? labels[String(status)] ?? status ?? 'Sin estado'}</Text>;
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  danger: {
    backgroundColor: '#FEE2E2',
    color: colors.danger,
  },
  neutral: {
    backgroundColor: '#E2E8F0',
    color: colors.muted,
  },
  success: {
    backgroundColor: '#DCFCE7',
    color: colors.success,
  },
  warning: {
    backgroundColor: '#FEF3C7',
    color: colors.warning,
  },
});
