import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { CashierHeader } from '@/features/cashier/components/CashierHeader';
import { canPayInvoice, InvoiceStatusBadge } from '@/features/cashier/components/InvoiceStatusBadge';
import { InvoiceTotalsCard } from '@/features/cashier/components/InvoiceTotalsCard';
import { PatientBillingCard } from '@/features/cashier/components/PatientBillingCard';
import { PaymentSummaryCard } from '@/features/cashier/components/PaymentSummaryCard';
import { getInvoiceDetail } from '@/features/cashier/services/cashierInvoiceService';
import { formatCurrency, formatDate, numericValue } from '@/features/cashier/types/commonCashier.types';
import type { CashierInvoiceDetail } from '@/features/cashier/types/cashierInvoice.types';

export function CashierInvoiceDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = useMemo(() => (route.params ?? {}) as { invoiceId?: number }, [route.params]);
  const [invoice, setInvoice] = useState<CashierInvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (!params.invoiceId) {
      setError('No se recibio la factura.');
      setLoading(false);
      return;
    }
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setInvoice(await getInvoiceDetail(params.invoiceId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la factura.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [params.invoiceId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading) return <LoadingState label="Cargando factura..." />;
  if (error || !invoice) return <ErrorState message={error || 'No hay informacion disponible.'} onRetry={() => void load()} title="Factura no disponible" />;

  const balance = numericValue(invoice.balance_due ?? invoice.balance);

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
        <CashierHeader subtitle="Resumen financiero de la factura." title="Detalle factura" />
        <AppCard style={styles.card}>
          <InvoiceStatusBadge status={invoice.status} />
          <Text style={styles.title}>{invoice.invoice_number ?? invoice.number ?? `Factura #${invoice.id}`}</Text>
          <Text style={styles.meta}>Fecha: {formatDate(invoice.issued_at ?? invoice.issue_date ?? invoice.created_at)}</Text>
          <Text style={styles.meta}>Moneda: {invoice.currency ?? 'L'}</Text>
          <Text style={styles.balance}>Saldo: {formatCurrency(invoice.balance_due ?? invoice.balance, invoice.currency ?? 'L')}</Text>
        </AppCard>
        <PatientBillingCard invoice={invoice} />
        <InvoiceTotalsCard invoice={invoice} />
        <Text style={styles.section}>Items</Text>
        {invoice.items?.length ? invoice.items.map((item, index) => (
          <AppCard key={item.id ?? index} style={styles.card}>
            <Text style={styles.itemTitle}>{item.description ?? 'Servicio'}</Text>
            <Text style={styles.meta}>Cantidad: {item.quantity ?? 1}</Text>
            <Text style={styles.meta}>Precio: {formatCurrency(item.unit_price, invoice.currency ?? 'L')}</Text>
            <Text style={styles.meta}>Total: {formatCurrency(item.total ?? item.subtotal, invoice.currency ?? 'L')}</Text>
          </AppCard>
        )) : <EmptyState description="La factura no tiene items visibles." title="Sin items" />}
        <Text style={styles.section}>Pagos</Text>
        {invoice.payments?.length ? invoice.payments.map((payment) => (
          <PaymentSummaryCard key={payment.id ?? payment.reference} onPress={() => navigation.navigate('CashierPaymentDetail', { paymentId: payment.id, invoiceId: invoice.id })} payment={payment} />
        )) : <EmptyState description="No hay pagos registrados para esta factura." title="Sin pagos" />}
        {balance > 0 && canPayInvoice(invoice.status) ? <AppButton label="Registrar pago" onPress={() => navigation.navigate('CashierRegisterPayment', { invoiceId: invoice.id })} /> : null}
        <AppButton label="Volver" onPress={() => navigation.goBack()} variant="secondary" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  balance: { color: colors.danger, fontSize: 16, fontWeight: '900' },
  card: { gap: 7 },
  content: { gap: 14, padding: 18, paddingBottom: 120 },
  itemTitle: { color: colors.ink, fontSize: 15, fontWeight: '900' },
  meta: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  safe: { backgroundColor: colors.background, flex: 1 },
  section: { color: colors.ink, fontSize: 16, fontWeight: '900', marginTop: 4 },
  title: { color: colors.ink, fontSize: 20, fontWeight: '900' },
});
