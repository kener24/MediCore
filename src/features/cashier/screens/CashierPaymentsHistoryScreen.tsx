import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppDateInput } from '@/components/AppDateInput';
import { AppInput } from '@/components/AppInput';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { CashierHeader } from '@/features/cashier/components/CashierHeader';
import { paymentMethods } from '@/features/cashier/components/PaymentForm';
import { PaymentSummaryCard } from '@/features/cashier/components/PaymentSummaryCard';
import { getPaymentsHistory } from '@/features/cashier/services/cashierPaymentService';
import type { CashierPayment, PaymentMethod } from '@/features/cashier/types/cashierPayment.types';
import type { QueryParams } from '@/features/cashier/types/commonCashier.types';

const filters = [['today', 'Hoy'], ['week', 'Semana'], ['all', 'Todos']] as const;

export function CashierPaymentsHistoryScreen() {
  const navigation = useNavigation<any>();
  const [filter, setFilter] = useState('today');
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | 'all'>('all');
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');
  const [payments, setPayments] = useState<CashierPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const params: QueryParams = filter === 'all' ? {} : { [filter]: true };
      if (date) {
        params.date = date;
        params.payment_date = date;
      }
      setPayments(await getPaymentsHistory(params));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los pagos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [date, filter]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const title = useMemo(() => filters.find(([value]) => value === filter)?.[1] ?? 'Hoy', [filter]);
  const visiblePayments = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return payments.filter((payment) => {
      const method = payment.method ?? payment.payment_method ?? '';
      if (methodFilter !== 'all' && method !== methodFilter) return false;
      if (date && !paymentMatchesDate(payment, date)) return false;
      if (!needle) return true;
      const searchable = [
        payment.patient_name,
        payment.invoice_number,
        payment.invoice_id,
        payment.reference,
        payment.received_by_name,
        payment.status,
      ].join(' ').toLowerCase();
      return searchable.includes(needle);
    });
  }, [date, methodFilter, payments, search]);

  if (loading) return <LoadingState label="Cargando pagos..." />;
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
        <CashierHeader subtitle={`Pagos registrados: ${title}.`} title="Historial de pagos" />
        <View style={styles.filters}>{filters.map(([value, label]) => <Text key={value} onPress={() => setFilter(value)} style={[styles.filter, filter === value && styles.filterActive]}>{label}</Text>)}</View>
        <AppInput autoCapitalize="none" label="Buscar" onChangeText={setSearch} placeholder="Paciente, factura o referencia" value={search} />
        <View style={styles.dateRow}>
          <View style={styles.dateInput}>
            <AppDateInput label="Fecha exacta" onChange={setDate} placeholder="Filtrar por fecha" value={date} />
          </View>
          {date ? <AppButton label="Limpiar" onPress={() => setDate('')} variant="secondary" /> : null}
        </View>
        <Text style={styles.label}>Metodo</Text>
        <View style={styles.filters}>
          <Text onPress={() => setMethodFilter('all')} style={[styles.filter, methodFilter === 'all' && styles.filterActive]}>Todos</Text>
          {paymentMethods.map((item) => (
            <Text key={item.value} onPress={() => setMethodFilter(item.value)} style={[styles.filter, methodFilter === item.value && styles.filterActive]}>{item.label}</Text>
          ))}
        </View>
        {error ? <ErrorState message={error} onRetry={() => void load()} title="No se pudieron cargar" /> : null}
        {!error && visiblePayments.length === 0 ? <EmptyState description="Ajusta los filtros o registra un pago nuevo." title="Sin pagos encontrados" /> : null}
        {visiblePayments.map((payment) => (
          <PaymentSummaryCard
            key={payment.id ?? `${payment.invoice_id}-${payment.reference ?? ''}-${payment.created_at ?? payment.paid_at ?? ''}`}
            onPress={() => navigation.navigate('CashierPaymentDetail', { invoiceId: payment.invoice_id, paymentId: payment.id })}
            payment={payment}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function paymentMatchesDate(payment: CashierPayment, date: string) {
  const raw = payment.paid_at ?? payment.payment_date ?? payment.created_at ?? '';
  return raw.startsWith(date);
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 18, paddingBottom: 120 },
  dateInput: { flex: 1 },
  dateRow: { alignItems: 'flex-end', flexDirection: 'row', gap: 10 },
  filter: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: 999, borderWidth: 1, color: colors.muted, fontSize: 12, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 9 },
  filterActive: { backgroundColor: colors.primary, borderColor: colors.primary, color: colors.white },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  label: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  safe: { backgroundColor: colors.background, flex: 1 },
});
