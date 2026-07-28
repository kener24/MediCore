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
  const routeParams = (route.params ?? {}) as { id?: number | string };
  const id = Number(routeParams.id);
  const hasValidId = Number.isFinite(id) && id > 0;
  const [payment, setPayment] = useState<PatientPayment | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    if (!hasValidId) {
      setError('No se encontró el pago solicitado.');
      setLoading(false);
      return;
    }
    try {
      setPayment(await getPatientPayment(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el pago.');
    } finally {
      setLoading(false);
    }
  }, [hasValidId, id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingState label="Cargando pago..." />;
  if (error || !payment) return <ErrorState message={error || 'No hay información disponible.'} onRetry={load} />;

  async function openReceipt() {
    if (sharing) return;
    setSharing(true);
    try {
      await sharePatientPaymentReceipt(id, payment?.payment_number);
    } catch (err) {
      Alert.alert('Recibo', err instanceof Error ? err.message : 'No se pudo abrir el recibo.');
    } finally {
      setSharing(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppButton label="Volver" onPress={() => navigation.goBack()} variant="secondary" />
        <AppCard style={styles.card}>
          <StatusBadge status={payment.status} />
          <Text style={styles.title}>{payment.payment_number || `Pago #${payment.id}`}</Text>
          <Text style={styles.amount}>{formatCurrency(payment.amount)}</Text>
          <Detail label="Fecha" value={formatDateTime(payment.payment_date || payment.creado_en)} />
          <Detail label="Método" value={payment.method} />
          <Detail label="Referencia" value={payment.reference} />
          <Detail label="Factura" value={payment.invoice_number || payment.invoice} />
          <Detail label="Recibido por" value={payment.received_by_nombre} />
        </AppCard>
        {payment.notes ? (
          <AppCard>
            <Text style={styles.sectionTitle}>Notas</Text>
            <Text style={styles.text}>{payment.notes}</Text>
          </AppCard>
        ) : null}
        <AppButton label="Abrir recibo PDF" loading={sharing} onPress={openReceipt} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Detail({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value ? String(value) : 'No indicado'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  amount: { color: colors.primaryDark, fontSize: 24, fontWeight: '900' },
  card: { gap: 8 },
  content: { gap: 14, padding: 22, paddingBottom: 34 },
  detail: { gap: 3 },
  detailLabel: { color: colors.muted, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  detailValue: { color: colors.ink, fontSize: 14, lineHeight: 20 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: '900' },
  text: { color: colors.ink, fontSize: 14, lineHeight: 21, marginTop: 8 },
  title: { color: colors.ink, fontSize: 22, fontWeight: '900' },
});
