import { StyleSheet, Text } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';
import type { CashierInvoice } from '@/features/cashier/types/cashierInvoice.types';

export function PatientBillingCard({ invoice }: { invoice: CashierInvoice }) {
  return (
    <AppCard style={styles.card}>
      <Text style={styles.title}>Paciente</Text>
      <Text style={styles.text}>{invoice.patient_name ?? 'No indicado'}</Text>
      <Text style={styles.meta}>Identidad: {invoice.patient_identity ?? 'No registrada'}</Text>
      <Text style={styles.meta}>Telefono: {invoice.patient_phone ?? 'No registrado'}</Text>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 6 },
  meta: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  text: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  title: { color: colors.muted, fontSize: 13, fontWeight: '900' },
});
