import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { CashierHeader } from '@/features/cashier/components/CashierHeader';
import { InvoiceCard } from '@/features/cashier/components/InvoiceCard';
import { getPendingInvoices } from '@/features/cashier/services/cashierInvoiceService';
import type { CashierInvoice } from '@/features/cashier/types/cashierInvoice.types';

const filters = [['pending', 'Pendientes'], ['partial', 'Parciales'], ['all', 'Todas']] as const;

export function CashierPendingInvoicesScreen() {
  const navigation = useNavigation<any>();
  const [filter, setFilter] = useState('all');
  const [invoices, setInvoices] = useState<CashierInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setInvoices(await getPendingInvoices());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las facturas.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const visible = useMemo(() => filter === 'all' ? invoices : invoices.filter((invoice) => normalizedStatus(invoice.status) === filter), [filter, invoices]);

  if (loading) return <LoadingState label="Cargando facturas..." />;
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
        <CashierHeader subtitle="Facturas pendientes o parcialmente pagadas." title="Facturas pendientes" />
        <View style={styles.filters}>{filters.map(([value, label]) => <Text key={value} onPress={() => setFilter(value)} style={[styles.filter, filter === value && styles.filterActive]}>{label}</Text>)}</View>
        {error ? <ErrorState message={error} onRetry={() => void load()} title="No se pudieron cargar" /> : null}
        {!error && visible.length === 0 ? <EmptyState description="No hay facturas pendientes." title="Sin facturas" /> : null}
        {visible.map((invoice) => (
          <InvoiceCard
            invoice={invoice}
            key={invoice.id ?? invoice.invoice_number}
            onPay={() => navigation.navigate('CashierRegisterPayment', { invoiceId: invoice.id })}
            onPress={() => navigation.navigate('CashierInvoiceDetail', { invoiceId: invoice.id })}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function normalizedStatus(status?: string) {
  const value = String(status ?? '').toLowerCase();
  if (value.includes('partial') || value.includes('parcial')) return 'partial';
  return 'pending';
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 18, paddingBottom: 120 },
  filter: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: 999, borderWidth: 1, color: colors.muted, fontSize: 12, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 9 },
  filterActive: { backgroundColor: colors.primary, borderColor: colors.primary, color: colors.white },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  safe: { backgroundColor: colors.background, flex: 1 },
});
