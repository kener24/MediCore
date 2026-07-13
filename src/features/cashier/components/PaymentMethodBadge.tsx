import { StyleSheet, Text } from 'react-native';

import { colors } from '@/core/theme/colors';

export function paymentMethodLabel(method?: string) {
  const value = String(method ?? '').toLowerCase();
  if (['cash', 'efectivo'].includes(value)) return 'Efectivo';
  if (['card', 'tarjeta'].includes(value)) return 'Tarjeta';
  if (['transfer', 'bank_transfer', 'mobile_money', 'transferencia'].includes(value)) return 'Transferencia';
  if (['deposit', 'deposito'].includes(value)) return 'Depósito';
  if (['check', 'cheque'].includes(value)) return 'Cheque';
  if (['other', 'otro'].includes(value)) return 'Otro';
  return method ? 'Otro' : 'Sin método';
}

export function PaymentMethodBadge({ method }: { method?: string }) {
  return <Text style={styles.badge}>{paymentMethodLabel(method)}</Text>;
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', backgroundColor: colors.palePrimary, borderRadius: 999, color: colors.primaryDark, fontSize: 12, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 5 },
});
