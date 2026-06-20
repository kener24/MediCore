import { StyleSheet, Text } from 'react-native';

import { colors } from '@/core/theme/colors';

export function paymentMethodLabel(method?: string) {
  const value = String(method ?? '').toLowerCase();
  if (value === 'cash') return 'Efectivo';
  if (value === 'card') return 'Tarjeta';
  if (value === 'transfer') return 'Transferencia';
  if (value === 'mobile_money') return 'Dinero móvil';
  if (value === 'check') return 'Cheque';
  return method ? 'Otro' : 'Sin método';
}

export function PaymentMethodBadge({ method }: { method?: string }) {
  return <Text style={styles.badge}>{paymentMethodLabel(method)}</Text>;
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', backgroundColor: colors.palePrimary, borderRadius: 999, color: colors.primaryDark, fontSize: 12, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 5 },
});
