import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppInput } from '@/components/AppInput';
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
  const [search, setSearch] = useState('');
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
  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return invoices.filter((invoice) => {
      if (filter !== 'all' && normalizedStatus(invoice.status) !== filter) return false;
      if (!needle) return true;
      const searchable = [
        invoice.invoice_number,
        invoice.number,
        invoice.patient_name,
        invoice.patient_identity,
        invoice.patient_phone,
        invoice.status,
      ].join(' ').toLowerCase();
      return searchable.includes(needle);
    });
  }, [filter, invoices, search]);

  function openInvoice(invoice: CashierInvoice) {
    if (!invoice.id) {
      Alert.alert('Factura', 'Esta factura no tiene identificador para abrir el detalle.');
      return;
    }
    navigation.navigate('CashierInvoiceDetail', { invoiceId: invoice.id });
  }

  function payInvoice(invoice: CashierInvoice) {
    if (!invoice.id) {
      Alert.alert('Factura', 'Esta factura no tiene identificador para registrar pago.');
      return;
    }
    navigation.navigate('CashierRegisterPayment', { invoiceId: invoice.id });
  }

  if (loading) return <LoadingState label="Cargando facturas..." />;
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
        <CashierHeader subtitle="Facturas pendientes o parcialmente pagadas." title="Facturas pendientes" />
        <View style={styles.filters}>{filters.map(([value, label]) => <Text key={value} onPress={() => setFilter(value)} style={[styles.filter, filter === value && styles.filterActive]}>{label}</Text>)}</View>
        <AppInput autoCapitalize="none" label="Buscar factura" onChangeText={setSearch} placeholder="Paciente, identidad, teléfono o factura" value={search} />
        {error ? <ErrorState message={error} onRetry={() => void load()} title="No se pudieron cargar" /> : null}
        {!error && visible.length === 0 ? (
          <EmptyState
            description={search.trim() || filter !== 'all' ? 'Ajusta la búsqueda o cambia el filtro para revisar otras facturas.' : 'No hay facturas pendientes de cobro en este momento.'}
            icon={search.trim() || filter !== 'all' ? 'file-search-outline' : 'cash-check'}
            title={search.trim() || filter !== 'all' ? 'Sin resultados de facturación' : 'Caja sin pendientes'}
            tone={search.trim() || filter !== 'all' ? 'warning' : 'success'}
          />
        ) : null}
        {visible.map((invoice) => (
          <InvoiceCard
            invoice={invoice}
            key={invoice.id ?? invoice.invoice_number}
            onPay={() => payInvoice(invoice)}
            onPress={() => openInvoice(invoice)}
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
