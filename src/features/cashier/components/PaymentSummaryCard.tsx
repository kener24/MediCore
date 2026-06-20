import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';
import { PaymentMethodBadge } from '@/features/cashier/components/PaymentMethodBadge';
import { PaymentStatusBadge } from '@/features/cashier/components/PaymentStatusBadge';
import { formatCurrency, formatDateTime } from '@/features/cashier/types/commonCashier.types';
import type { CashierPayment } from '@/features/cashier/types/cashierPayment.types';

export function PaymentSummaryCard({ onPress, payment }: { onPress?: () => void; payment: CashierPayment }) {
  return (
    <Pressable disabled={!onPress} onPress={onPress}>
      <AppCard style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.title}>{payment.patient_name ?? payment.invoice_number ?? 'Pago'}</Text>
          <PaymentStatusBadge status={payment.status} />
        </View>
        <Text style={styles.amount}>{formatCurrency(payment.amount)}</Text>
        <Text style={styles.meta}>Factura: {payment.invoice_number ?? payment.invoice_id ?? 'No indicada'}</Text>
        <Text style={styles.meta}>Fecha: {formatDateTime(payment.paid_at ?? payment.payment_date ?? payment.created_at)}</Text>
        <PaymentMethodBadge method={payment.method ?? payment.payment_method} />
      </AppCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  amount: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  card: { gap: 7 },
  meta: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  row: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  title: { color: colors.ink, flex: 1, fontSize: 16, fontWeight: '900' },
});
