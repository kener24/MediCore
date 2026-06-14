import { useFocusEffect, useNavigation, type NavigationProp, type ParamListBase } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { InvoiceCard } from '@/features/patient/components/InvoiceCard';
import { PatientHeader } from '@/features/patient/components/PatientHeader';
import { getPatientInvoices } from '@/features/patient/services/patientInvoicesService';
import type { PatientInvoice, PatientInvoiceFilter } from '@/features/patient/types/patientInvoices.types';

const filters: { label: string; value: PatientInvoiceFilter }[] = [
  { label: 'Todas', value: 'all' },
  { label: 'Pendientes', value: 'pending' },
  { label: 'Pagadas', value: 'paid' },
];

export function PatientInvoicesScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [invoices, setInvoices] = useState<PatientInvoice[]>([]);
  const [filter, setFilter] = useState<PatientInvoiceFilter>('all');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setInvoices(await getPatientInvoices());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const visibleInvoices = useMemo(
    () =>
      invoices.filter((invoice) => {
        if (filter === 'all') return true;
        if (filter === 'paid') return invoice.status === 'pagada';
        return invoice.status === 'pendiente' || invoice.status === 'parcialmente_pagada';
      }),
    [filter, invoices],
  );

  if (loading) return <LoadingState label="Cargando facturas..." />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => load(true)} refreshing={refreshing} />}
        showsVerticalScrollIndicator={false}>
        <PatientHeader subtitle="Consulta tus facturas, pagos y saldos." title="Mis facturas" />
        <View style={styles.filters}>
          {filters.map((item) => (
            <AppButton
              key={item.value}
              label={item.label}
              onPress={() => setFilter(item.value)}
              style={styles.filterButton}
              variant={filter === item.value ? 'primary' : 'secondary'}
            />
          ))}
        </View>
        {error ? (
          <ErrorState message={error} onRetry={() => load()} title="No se pudieron cargar las facturas" />
        ) : visibleInvoices.length ? (
          visibleInvoices.map((invoice) => (
            <InvoiceCard
              invoice={invoice}
              key={invoice.id}
              onPress={() => navigation.navigate('PatientInvoiceDetail', { id: invoice.id })}
            />
          ))
        ) : (
          <EmptyState description="No hay facturas para mostrar." title="Sin facturas" />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, padding: 22, paddingBottom: 34 },
  filterButton: { flex: 1, height: 44, paddingHorizontal: 8 },
  filters: { flexDirection: 'row', gap: 8 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
});
