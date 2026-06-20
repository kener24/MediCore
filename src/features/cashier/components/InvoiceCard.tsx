import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';
import { canPayInvoice, InvoiceStatusBadge } from '@/features/cashier/components/InvoiceStatusBadge';
import { formatCurrency, formatDate } from '@/features/cashier/types/commonCashier.types';
import type { CashierInvoice } from '@/features/cashier/types/cashierInvoice.types';

export function InvoiceCard({ invoice, onPay, onPress }: { invoice: CashierInvoice; onPay?: () => void; onPress: () => void }) {
  const currency = invoice.currency ?? 'L';
  return (
    <AppCard style={styles.card}>
      <Pressable onPress={onPress} style={styles.body}>
        <View style={styles.row}>
          <Text style={styles.number}>{invoice.invoice_number ?? invoice.number ?? `Factura #${invoice.id}`}</Text>
          <InvoiceStatusBadge status={invoice.status} />
        </View>
        <Text style={styles.meta}>Paciente: {invoice.patient_name ?? 'No indicado'}</Text>
        <Text style={styles.meta}>Fecha: {formatDate(invoice.issued_at ?? invoice.issue_date ?? invoice.created_at)}</Text>
        <Text style={styles.total}>Total: {formatCurrency(invoice.total_amount ?? invoice.total, currency)}</Text>
        <Text style={styles.balance}>Saldo: {formatCurrency(invoice.balance_due ?? invoice.balance, currency)}</Text>
      </Pressable>
      {onPay && canPayInvoice(invoice.status) ? (
        <Pressable onPress={onPay} style={styles.payButton}>
          <Text style={styles.payText}>Registrar pago</Text>
        </Pressable>
      ) : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  balance: { color: colors.danger, fontSize: 14, fontWeight: '900' },
  body: { gap: 6 },
  card: { gap: 10 },
  meta: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  number: { color: colors.ink, flex: 1, fontSize: 16, fontWeight: '900' },
  payButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 12, padding: 12 },
  payText: { color: colors.white, fontSize: 13, fontWeight: '900' },
  row: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  total: { color: colors.ink, fontSize: 14, fontWeight: '900' },
});
