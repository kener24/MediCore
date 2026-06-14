import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';
import { StatusPill } from '@/features/patient/components/StatusPill';
import type { PatientInvoice } from '@/features/patient/types/patientInvoices.types';
import { formatCurrency, formatDate, getInvoiceTone } from '@/features/patient/utils/formatters';

export function InvoiceCard({ invoice, onPress }: { invoice: PatientInvoice; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <AppCard>
        <View style={styles.header}>
          <Text style={styles.number}>{invoice.invoice_number || `Factura #${invoice.id}`}</Text>
          <StatusPill label={invoice.status} tone={getInvoiceTone(invoice.status)} />
        </View>
        <Text style={styles.date}>{formatDate(invoice.issue_date)}</Text>
        <View style={styles.amounts}>
          <Text style={styles.total}>{formatCurrency(invoice.total_amount)}</Text>
          <Text style={styles.balance}>Saldo {formatCurrency(invoice.balance_due)}</Text>
        </View>
      </AppCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  amounts: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  balance: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  date: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 6,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  number: {
    color: colors.ink,
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.85,
  },
  total: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
  },
});
