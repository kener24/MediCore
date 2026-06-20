import { StyleSheet, Text } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';
import { formatCurrency } from '@/features/cashier/types/commonCashier.types';
import type { CashierInvoice } from '@/features/cashier/types/cashierInvoice.types';

export function InvoiceTotalsCard({ invoice }: { invoice: CashierInvoice }) {
  const currency = invoice.currency ?? 'L';
  return (
    <AppCard style={styles.card}>
      <Row label="Subtotal" value={formatCurrency(invoice.subtotal, currency)} />
      <Row label="Descuento" value={formatCurrency(invoice.discount_total ?? invoice.discount, currency)} />
      <Row label="Impuesto" value={formatCurrency(invoice.tax_total ?? invoice.tax, currency)} />
      <Row emphasis label="Total" value={formatCurrency(invoice.total_amount ?? invoice.total, currency)} />
      <Row label="Pagado" value={formatCurrency(invoice.paid_amount ?? invoice.amount_paid, currency)} />
      <Row danger label="Saldo" value={formatCurrency(invoice.balance_due ?? invoice.balance, currency)} />
    </AppCard>
  );
}

function Row({ danger, emphasis, label, value }: { danger?: boolean; emphasis?: boolean; label: string; value: string }) {
  return (
    <Text style={[styles.row, emphasis && styles.emphasis, danger && styles.danger]}>
      {label}: {value}
    </Text>
  );
}

const styles = StyleSheet.create({
  card: { gap: 7 },
  danger: { color: colors.danger },
  emphasis: { color: colors.ink, fontSize: 17 },
  row: { color: colors.muted, fontSize: 14, fontWeight: '800', lineHeight: 21 },
});
