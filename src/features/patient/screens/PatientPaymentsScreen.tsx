import { useFocusEffect, useNavigation, type NavigationProp, type ParamListBase } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppCard } from '@/components/AppCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { StatusBadge } from '@/components/StatusBadge';
import { colors } from '@/core/theme/colors';
import { formatDate } from '@/core/utils/dateUtils';
import { formatCurrency } from '@/core/utils/moneyUtils';
import { PatientHeader } from '@/features/patient/components/PatientHeader';
import { getPatientPayments } from '@/features/patient/services/patientPaymentsService';
import type { PatientPayment } from '@/features/patient/types/patientPayments.types';

export function PatientPaymentsScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [payments, setPayments] = useState<PatientPayment[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setPayments(await getPatientPayments());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los pagos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <LoadingState label="Cargando pagos..." />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => load(true)} refreshing={refreshing} />}
        showsVerticalScrollIndicator={false}>
        <PatientHeader subtitle="Historial de pagos aplicados a tus facturas." title="Mis pagos" />
        {error ? (
          <ErrorState message={error} onRetry={() => load()} title="No se pudieron cargar los pagos" />
        ) : payments.length ? (
          payments.map((payment) => (
            <Pressable key={payment.id} onPress={() => navigation.navigate('PatientPaymentDetail', { id: payment.id })}>
              <AppCard style={styles.card}>
                <StatusBadge status={payment.status} />
                <Text style={styles.title}>{payment.payment_number || `Pago #${payment.id}`}</Text>
                <Text style={styles.amount}>{formatCurrency(payment.amount)}</Text>
                <Text style={styles.meta}>{formatDate(payment.payment_date || payment.creado_en)} · {payment.method || 'Metodo no indicado'}</Text>
                <Text style={styles.meta}>{payment.invoice_number ? `Factura ${payment.invoice_number}` : 'Factura no indicada'}</Text>
              </AppCard>
            </Pressable>
          ))
        ) : (
          <EmptyState description="No tienes pagos registrados." title="Sin pagos" />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  amount: { color: colors.primaryDark, fontSize: 20, fontWeight: '900' },
  card: { gap: 7 },
  content: { gap: 12, padding: 22, paddingBottom: 34 },
  meta: { color: colors.muted, fontSize: 13 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  title: { color: colors.ink, fontSize: 17, fontWeight: '900' },
});
