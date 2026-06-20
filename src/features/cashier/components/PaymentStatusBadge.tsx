import { StyleSheet, Text } from 'react-native';

import { colors } from '@/core/theme/colors';

export function paymentStatusLabel(status?: string) {
  const value = String(status ?? '').toLowerCase();
  if (['confirmed', 'paid', 'pagado', 'confirmado'].includes(value)) return 'Confirmado';
  if (['cancelled', 'canceled', 'cancelado'].includes(value)) return 'Cancelado';
  if (['failed', 'fallido'].includes(value)) return 'Fallido';
  return 'Pendiente';
}

export function PaymentStatusBadge({ status }: { status?: string }) {
  const label = paymentStatusLabel(status);
  return <Text style={[styles.badge, styles[label] ?? styles.Pendiente]}>{label}</Text>;
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', borderRadius: 999, fontSize: 12, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 5 },
  Cancelado: { backgroundColor: '#fee2e2', color: colors.danger },
  Confirmado: { backgroundColor: '#dcfce7', color: '#15803d' },
  Fallido: { backgroundColor: '#fee2e2', color: colors.danger },
  Pendiente: { backgroundColor: '#fef3c7', color: '#92400e' },
});
