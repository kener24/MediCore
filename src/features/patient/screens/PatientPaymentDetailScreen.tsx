import { useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { StatusBadge } from '@/components/StatusBadge';
import { colors } from '@/core/theme/colors';
import { formatDateTime } from '@/core/utils/dateUtils';
import { formatCurrency } from '@/core/utils/moneyUtils';
import { getPatientPayment, sharePatientPaymentReceipt } from '@/features/patient/services/patientPaymentsService';
import type { PatientPayment } from '@/features/patient/types/patientPayments.types';

export function PatientPaymentDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const id = Number(((route.params ?? {}) as { id?: number | string }).id);
  const [payment, setPayment] = useState<PatientPayment | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    if (!Number.isFinite(id) || id <= 0) { setError('No se encontró el pago solicitado.'); setLoading(false); return; }
    try { setPayment(await getPatientPayment(id)); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo cargar el pago.'); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);
  if (loading) return <LoadingState label="Cargando pago..." />;
  if (error || !payment) return <ErrorState message={error || 'No hay información disponible.'} onRetry={load} />;
  const receiptAvailable = payment.receipt_available !== false && payment.status !== 'anulado';
  async function openReceipt() {
    if (!payment || sharing || !receiptAvailable) return;
    setSharing(true);
    try { await sharePatientPaymentReceipt(id, payment.payment_number); }
    catch (err) { Alert.alert('Recibo', err instanceof Error ? err.message : 'No se pudo abrir el recibo.'); }
    finally { setSharing(false); }
  }
  return <SafeAreaView style={styles.safeArea}><ScrollView contentContainerStyle={styles.content}>
    <AppButton label="Volver" onPress={() => navigation.goBack()} variant="secondary" />
    <AppCard style={styles.card}>
      <StatusBadge label={payment.status_display} status={payment.status} />
      <Text style={styles.title}>{payment.payment_number || `Pago #${payment.id}`}</Text>
      <Text style={styles.amount}>{formatCurrency(payment.amount)}</Text>
      <Detail label="Fecha" value={formatDateTime(payment.payment_date || payment.creado_en)} />
      <Detail label="Método" value={payment.method_display || payment.method} />
      <Detail label="Referencia" value={payment.reference_visible} />
      <Detail label="Factura" value={payment.invoice_number || payment.invoice} />
      <Detail label="Saldo anterior" value={formatCurrency(payment.balance_before)} />
      <Detail label="Saldo posterior" value={formatCurrency(payment.balance_after)} />
    </AppCard>
    {payment.status === 'anulado' ? <AppCard><Text style={styles.warning}>Este pago fue anulado y se conserva únicamente como historial.</Text></AppCard> : null}
    <AppButton disabled={!receiptAvailable} label={receiptAvailable ? 'Abrir recibo PDF' : 'Recibo no disponible'} loading={sharing} onPress={openReceipt} />
  </ScrollView></SafeAreaView>;
}

function Detail({ label, value }: { label: string; value?: string | number | null }) {
  return <View style={styles.detail}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value || 'No indicado'}</Text></View>;
}
const styles = StyleSheet.create({
  amount: { color: colors.primaryDark, fontSize: 24, fontWeight: '900' }, card: { gap: 8 }, content: { gap: 14, padding: 22, paddingBottom: 34 },
  detail: { gap: 3 }, detailLabel: { color: colors.muted, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' }, detailValue: { color: colors.ink, fontSize: 14 },
  safeArea: { backgroundColor: colors.background, flex: 1 }, title: { color: colors.ink, fontSize: 22, fontWeight: '900' }, warning: { color: colors.danger, fontSize: 14, fontWeight: '800', lineHeight: 20 },
});
