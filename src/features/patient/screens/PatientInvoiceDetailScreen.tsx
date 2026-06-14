import { useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { StatusPill } from '@/features/patient/components/StatusPill';
import { getPatientInvoice } from '@/features/patient/services/patientInvoicesService';
import type { PatientInvoice } from '@/features/patient/types/patientInvoices.types';
import { formatCurrency, formatDate, getInvoiceTone } from '@/features/patient/utils/formatters';

export function PatientInvoiceDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { id } = route.params as { id: number };
  const [invoice, setInvoice] = useState<PatientInvoice | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setInvoice(await getPatientInvoice(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingState label="Cargando factura..." />;
  if (error || !invoice) return <ErrorState message={error || 'No hay informacion disponible.'} onRetry={load} />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppButton label="Volver" onPress={() => navigation.goBack()} variant="secondary" />
        <AppCard>
          <StatusPill label={invoice.status} tone={getInvoiceTone(invoice.status)} />
          <Text style={styles.title}>{invoice.invoice_number || `Factura #${invoice.id}`}</Text>
          <Text style={styles.meta}>Fecha: {formatDate(invoice.issue_date)}</Text>
          <Detail label="Subtotal" value={formatCurrency(invoice.subtotal)} />
          <Detail label="Descuentos" value={formatCurrency(invoice.discount_amount)} />
          <Detail label="Impuestos" value={formatCurrency(invoice.tax_amount)} />
          <Detail label="Total" value={formatCurrency(invoice.total_amount)} />
          <Detail label="Pagado" value={formatCurrency(invoice.paid_amount)} />
          <Detail label="Saldo" value={formatCurrency(invoice.balance_due)} />
        </AppCard>

        <Text style={styles.sectionTitle}>Items</Text>
        {invoice.items?.length ? (
          invoice.items.map((item, index) => (
            <AppCard key={`${item.id ?? index}-${item.description}`}>
              <Text style={styles.itemTitle}>{item.description || item.service_name || 'Item'}</Text>
              <Text style={styles.meta}>Cantidad {item.quantity || '1'} · {formatCurrency(item.line_total)}</Text>
            </AppCard>
          ))
        ) : (
          <EmptyState description="La factura no tiene items visibles." title="Sin items" />
        )}

        <Text style={styles.sectionTitle}>Pagos</Text>
        {invoice.payments?.length ? (
          invoice.payments.map((payment, index) => (
            <AppCard key={`${payment.id ?? index}-${payment.payment_number}`}>
              <Text style={styles.itemTitle}>{payment.payment_number || 'Pago'}</Text>
              <Text style={styles.meta}>{formatDate(payment.payment_date)} · {formatCurrency(payment.amount)}</Text>
            </AppCard>
          ))
        ) : (
          <EmptyState description="No hay pagos registrados para esta factura." title="Sin pagos" />
        )}

        <AppButton label="PDF no disponible aun" disabled variant="secondary" />
      </ScrollView>
    </SafeAreaView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 22, paddingBottom: 34 },
  detail: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  detailLabel: { color: colors.muted, fontSize: 13, fontWeight: '800' },
  detailValue: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  itemTitle: { color: colors.ink, fontSize: 15, fontWeight: '900' },
  meta: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 6 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  title: { color: colors.ink, fontSize: 22, fontWeight: '900', marginTop: 12 },
});
