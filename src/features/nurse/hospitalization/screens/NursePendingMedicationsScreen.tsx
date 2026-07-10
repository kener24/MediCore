import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { SearchAndFilters } from '@/features/nurse/components/NurseListTools';
import { getPendingMedications } from '@/features/nurse/hospitalization/services/nurseHospitalizationService';
import { MedicationCard } from '@/features/nurse/hospitalization/screens/NurseMedicationAdministrationsScreen';
import type { MedicationAdministration } from '@/features/nurse/hospitalization/types/nurseHospitalization.types';

type MedicationFilter = 'all' | 'pending' | 'delayed';

const filters: { label: string; value: MedicationFilter }[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Pendientes', value: 'pending' },
  { label: 'Retrasados', value: 'delayed' },
];

export function NursePendingMedicationsScreen() {
  const [items, setItems] = useState<MedicationAdministration[]>([]);
  const [filter, setFilter] = useState<MedicationFilter>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setItems(await getPendingMedications());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los medicamentos pendientes.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      const status = String(item.status ?? '').toLowerCase();
      const matchesFilter = filter === 'all' || status === filter;
      const matchesSearch = !term || [item.medication_name, item.dosage, item.patient_name, item.notes].filter(Boolean).join(' ').toLowerCase().includes(term);
      return matchesFilter && matchesSearch;
    });
  }, [filter, items, search]);

  if (loading) return <LoadingState label="Cargando pendientes..." />;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
        <AppHeader icon="pill" subtitle="Medicamentos pendientes o retrasados de la clínica." title="Medicamentos pendientes" />
        <Text style={styles.counter}>{filtered.length} de {items.length} medicamentos</Text>
        <SearchAndFilters filters={filters} onFilterChange={setFilter} onSearchChange={setSearch} search={search} searchLabel="Buscar medicamento, paciente o dosis" selectedFilter={filter} />
        {error ? <ErrorState message={error} onRetry={() => void load()} title="No se pudieron cargar pendientes" /> : null}
        {!error && filtered.length === 0 ? <EmptyState description="No hay medicamentos pendientes con esos filtros." title="Sin pendientes" /> : null}
        {filtered.map((item) => <MedicationCard item={item} key={item.id ?? item.medication_name} />)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 18, paddingBottom: 110 },
  counter: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  safe: { backgroundColor: colors.background, flex: 1 },
});
