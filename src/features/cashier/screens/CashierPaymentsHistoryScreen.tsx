import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { CashierHeader } from '@/features/cashier/components/CashierHeader';
import { PaymentSummaryCard } from '@/features/cashier/components/PaymentSummaryCard';
import { getPaymentsHistory } from '@/features/cashier/services/cashierPaymentService';
import type { CashierPayment } from '@/features/cashier/types/cashierPayment.types';

const filters = [['today', 'Hoy'], ['week', 'Semana'], ['all', 'Todos']] as const;

export function CashierPaymentsHistoryScreen() {
  const navigation = useNavigation<any>();
  const [filter, setFilter] = useState('today');
  const [payments, setPayments] = useState<CashierPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setPayments(await getPaymentsHistory(filter === 'all' ? undefined : { [filter]: true }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los pagos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const title = useMemo(() => filters.find(([value]) => value === filter)?.[1] ?? 'Hoy', [filter]);

  if (loading) return <LoadingState label="Cargando pagos..." />;
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
        <CashierHeader subtitle={`Pagos registrados: ${title}.`} title="Historial de pagos" />
        <View style={styles.filters}>{filters.map(([value, label]) => <Text key={value} onPress={() => setFilter(value)} style={[styles.filter, filter === value && styles.filterActive]}>{label}</Text>)}</View>
        {error ? <ErrorState message={error} onRetry={() => void load()} title="No se pudieron cargar" /> : null}
        {!error && payments.length === 0 ? <EmptyState description="No hay pagos registrados." title="Sin pagos" /> : null}
        {payments.map((payment) => <PaymentSummaryCard key={payment.id ?? payment.reference} onPress={() => navigation.navigate('CashierPaymentDetail', { invoiceId: payment.invoice_id, paymentId: payment.id })} payment={payment} />)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 18, paddingBottom: 120 },
  filter: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: 999, borderWidth: 1, color: colors.muted, fontSize: 12, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 9 },
  filterActive: { backgroundColor: colors.primary, borderColor: colors.primary, color: colors.white },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  safe: { backgroundColor: colors.background, flex: 1 },
});
