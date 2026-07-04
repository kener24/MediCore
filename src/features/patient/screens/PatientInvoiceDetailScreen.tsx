import { useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { StatusBadge } from '@/components/StatusBadge';
import { colors } from '@/core/theme/colors';
import { formatDate } from '@/core/utils/dateUtils';
import { formatCurrency } from '@/core/utils/moneyUtils';
import { getInvoiceFiscalPdf, getPatientInvoice } from '@/features/patient/services/patientInvoicesService';
import type { PatientInvoice } from '@/features/patient/types/patientInvoices.types';

export function PatientInvoiceDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const routeParams = (route.params ?? {}) as { id?: number | string };
  const id = Number(routeParams.id);
  const hasValidId = Number.isFinite(id) && id > 0;
  const [invoice, setInvoice] = useState<PatientInvoice | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingPdf, setLoadingPdf] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    if (!hasValidId) {
      setError('No se encontró la factura solicitada.');
      setLoading(false);
      return;
    }
    try {
      setInvoice(await getPatientInvoice(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos.');
    } finally {
      setLoading(false);
    }
  }, [hasValidId, id]);

  useEffect(() => { load(); }, [load]);

  async function requestFiscalPdf() {
    if (!invoice) return;
    setLoadingPdf(true);
    try {
      await getInvoiceFiscalPdf(invoice.id);
      Alert.alert('PDF fiscal', 'El PDF fiscal fue consultado correctamente desde el portal seguro.');
    } catch (err) {
      Alert.alert('PDF fiscal', err instanceof Error ? err.message : 'No se pudo obtener el PDF fiscal.');
    } finally {
      setLoadingPdf(false);
    }
  }

  if (loading) return <LoadingState label="Cargando factura..." />;
  if (error || !invoice) return <ErrorState message={error || 'No hay información disponible.'} onRetry={load} />;

  const canRequestFiscalPdf = Boolean(
    invoice.is_fiscal &&
      ['issued', 'cancelled', 'emitida', 'anulada'].includes(String(invoice.fiscal_status)),
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppButton label="Volver" onPress={() => navigation.goBack()} variant="secondary" />
        <AppCard>
          <StatusBadge status={invoice.status} />
          <Text style={styles.title}>{invoice.invoice_number || `Factura #${invoice.id}`}</Text>
          <Text style={styles.meta}>Fecha: {formatDate(invoice.issue_date || invoice.created_at)}</Text>
          <Text style={styles.meta}>Clínica: {invoice.clinic_name || 'No indicada'}</Text>
          <Text style={styles.meta}>Paciente: {invoice.patient_name || 'No indicado'}</Text>
          {invoice.fiscal_number ? <Detail label="Número fiscal" value={invoice.fiscal_number} /> : null}
          {invoice.cai ? <Detail label="CAI" value={invoice.cai} /> : null}
          <Detail label="Subtotal" value={formatCurrency(invoice.subtotal)} />
          <Detail label="Descuentos" value={formatCurrency(invoice.discount_total ?? invoice.discount_amount)} />
          <Detail label="Impuestos" value={formatCurrency(invoice.tax_total ?? invoice.tax_amount)} />
          <Detail label="Total" value={formatCurrency(invoice.total_amount ?? invoice.total)} />
          <Detail label="Pagado" value={formatCurrency(invoice.paid_amount)} />
          <Detail label="Saldo" value={formatCurrency(invoice.balance_due ?? invoice.balance)} />
          {invoice.notes ? <Text style={styles.meta}>Notas: {invoice.notes}</Text> : null}
        </AppCard>

        <Text style={styles.sectionTitle}>Items</Text>
        {invoice.items?.length ? (
          invoice.items.map((item, index) => (
            <AppCard key={`${item.id ?? index}-${item.description || item.item_name}`}>
              <Text style={styles.itemTitle}>{item.description || item.item_name || item.service_name || 'Item'}</Text>
              <Text style={styles.meta}>Cantidad {item.quantity || '1'} - {formatCurrency(item.line_total ?? item.total)}</Text>
            </AppCard>
          ))
        ) : (
          <EmptyState description="La factura no tiene items visibles." title="Sin items" />
        )}

        <Text style={styles.sectionTitle}>Pagos</Text>
        {invoice.payments?.length ? (
          invoice.payments.map((payment, index) => (
            <AppCard key={`${payment.id ?? index}-${payment.payment_number || payment.reference}`}>
              <Text style={styles.itemTitle}>{payment.payment_number || payment.payment_method || payment.method || 'Pago'}</Text>
              <Text style={styles.meta}>{formatDate(payment.payment_date)} - {formatCurrency(payment.amount)}</Text>
            </AppCard>
          ))
        ) : (
          <EmptyState description="No hay pagos registrados para esta factura." title="Sin pagos" />
        )}

        <AppButton
          disabled={!canRequestFiscalPdf}
          label={canRequestFiscalPdf ? 'Validar PDF fiscal' : 'PDF fiscal no disponible'}
          loading={loadingPdf}
          onPress={requestFiscalPdf}
          variant="secondary"
        />
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
  detailValue: { color: colors.ink, flexShrink: 1, fontSize: 14, fontWeight: '900', textAlign: 'right' },
  itemTitle: { color: colors.ink, fontSize: 15, fontWeight: '900' },
  meta: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 6 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  title: { color: colors.ink, fontSize: 22, fontWeight: '900', marginTop: 12 },
});
