import { StyleSheet, Text } from 'react-native';

import { colors } from '@/core/theme/colors';

const labels: Record<string, string> = {
  cancelled: 'Cancelada',
  completed: 'Finalizada',
  consultation_finished: 'Consulta finalizada',
  in_consultation: 'En consulta',
  in_triage: 'En triaje',
  paid: 'Pagada',
  registered: 'Registrada',
  waiting_billing: 'Pendiente de cobro',
  waiting_doctor: 'Esperando medico',
  waiting_payment: 'Pendiente de pago',
  waiting_triage: 'Esperando triaje',
};

export function visitStatusLabel(status?: string) {
  return labels[String(status ?? '')] ?? String(status ?? 'Sin estado');
}

export function VisitStatusBadge({ status }: { status?: string }) {
  const danger = status === 'cancelled';
  return <Text style={[styles.badge, danger && styles.danger]}>{visitStatusLabel(status)}</Text>;
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.palePrimary,
    borderRadius: 999,
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
    textTransform: 'uppercase',
  },
  danger: {
    backgroundColor: '#fff1f1',
    color: colors.danger,
  },
});
