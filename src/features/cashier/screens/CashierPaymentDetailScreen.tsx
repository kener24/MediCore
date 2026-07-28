import { useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { toPositiveId } from '@/core/utils/idUtils';
import { CashierHeader } from '@/features/cashier/components/CashierHeader';
import { PaymentMethodBadge } from '@/features/cashier/components/PaymentMethodBadge';
import { PaymentStatusBadge } from '@/features/cashier/components/PaymentStatusBadge';
import { getPaymentDetail, sharePaymentReceipt } from '@/features/cashier/services/cashierPaymentService';
import type { CashierPayment } from '@/features/cashier/types/cashierPayment.types';
import { formatCurrency, formatDateTime } from '@/features/cashier/types/commonCashier.types';

export function CashierPaymentDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = useMemo(() => (route.params ?? {}) as { invoiceId?: number; paymentId?: number }, [route.params]);
  const invoiceId = toPositiveId(params.invoiceId);
  const paymentId = toPositiveId(params.paymentId);
  const [payment, setPayment] = useState<CashierPayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sharing, setSharing] = useState(false);

  const load = useCallback(async () => {
    if (!paymentId) {
      setError('No se encontró el pago.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setPayment(await getPaymentDetail(paymentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el pago.');
    } finally {
      setLoading(false);
    }
  }, [paymentId]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <LoadingState label="Cargando pago..." />;
  if (error || !payment) return <ErrorState message={error || 'Pago no disponible.'} onRetry={() => void load()} title="Pago no disponible" />;

  async function openReceipt() {
    if (!paymentId || sharing) return;
    setSharing(true);
    try {
      await sharePaymentReceipt(paymentId, payment?.payment_number);
    } catch (err) {
      Alert.alert('Recibo', err instanceof Error ? err.message : 'No se pudo abrir el recibo.');
    } finally {
      setSharing(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <CashierHeader subtitle="Resumen simple del pago registrado." title="Detalle pago" />
        <AppCard style={styles.card}>
          <PaymentStatusBadge status={payment.status} />
          <Text style={styles.amount}>{formatCurrency(payment.amount)}</Text>
          <Text style={styles.meta}>Factura: {payment.invoice_number ?? payment.invoice_id ?? 'No indicada'}</Text>
          <Text style={styles.meta}>Paciente: {payment.patient_name ?? 'No indicado'}</Text>
          <Text style={styles.meta}>Fecha: {formatDateTime(payment.paid_at ?? payment.payment_date ?? payment.created_at)}</Text>
          <PaymentMethodBadge method={payment.method ?? payment.payment_method} />
          <Text style={styles.meta}>Referencia: {payment.reference ?? 'No registrada'}</Text>
          <Text style={styles.meta}>Recibido por: {payment.received_by_name ?? 'No indicado'}</Text>
          <Text style={styles.meta}>Notas: {payment.notes ?? 'Sin notas'}</Text>
          <Text style={styles.meta}>Saldo anterior: {formatCurrency(payment.balance_before)}</Text>
          <Text style={styles.meta}>Saldo posterior: {formatCurrency(payment.balance_after)}</Text>
        </AppCard>
        <AppButton label="Abrir recibo PDF" loading={sharing} onPress={openReceipt} />
        {invoiceId ? <AppButton label="Volver a factura" onPress={() => navigation.navigate('CashierInvoiceDetail', { invoiceId })} /> : null}
        <AppButton label="Volver" onPress={() => navigation.goBack()} variant="secondary" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  amount: { color: colors.ink, fontSize: 24, fontWeight: '900' },
  card: { gap: 8 },
  content: { gap: 14, padding: 18, paddingBottom: 120 },
  meta: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  safe: { backgroundColor: colors.background, flex: 1 },
});
