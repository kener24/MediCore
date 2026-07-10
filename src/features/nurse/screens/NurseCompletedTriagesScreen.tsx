import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { SearchAndFilters } from '@/features/nurse/components/NurseListTools';
import { TriageCard } from '@/features/nurse/components/NurseCards';
import { getCompletedTriages } from '@/features/nurse/services/nurseApi';
import type { NurseTriage } from '@/features/nurse/types/nurse.types';

type CompletedFilter = 'all' | 'urgent' | 'normal';

const filters: { label: string; value: CompletedFilter }[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Urgentes', value: 'urgent' },
  { label: 'Normales', value: 'normal' },
];

export function NurseCompletedTriagesScreen() {
  const navigation = useNavigation<any>();
  const [triages, setTriages] = useState<NurseTriage[]>([]);
  const [filter, setFilter] = useState<CompletedFilter>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setTriages(await getCompletedTriages());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los triajes realizados.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return triages.filter((triage) => {
      const priority = String(triage.priority ?? '').toLowerCase();
      const matchesFilter = filter === 'all' || (filter === 'urgent' && ['critical', 'urgent', 'critica', 'urgente'].includes(priority)) || (filter === 'normal' && ['normal', 'preferential', 'preferente', 'low', 'baja'].includes(priority));
      const matchesSearch = !term || [triage.patient.name, triage.patient.document, triage.chiefComplaint, triage.initialAssessment, triage.doctorName].filter(Boolean).join(' ').toLowerCase().includes(term);
      return matchesFilter && matchesSearch;
    });
  }, [filter, search, triages]);

  if (loading) return <LoadingState label="Cargando triajes..." />;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => { setRefreshing(true); void load(); }} refreshing={refreshing} />}>
        <AppHeader icon="format-list-checks" subtitle="Evaluaciones iniciales finalizadas." title="Triajes realizados" />
        <Text style={styles.counter}>{filtered.length} de {triages.length} triajes</Text>
        <SearchAndFilters filters={filters} onFilterChange={setFilter} onSearchChange={setSearch} search={search} searchLabel="Buscar por paciente, documento o evaluación" selectedFilter={filter} />
        {error ? <ErrorState message={error} onRetry={() => void load()} title="Triajes no disponibles" /> : null}
        {!error && filtered.length === 0 ? <EmptyState description="No hay triajes completados que coincidan." title="Sin registros" /> : null}
        {filtered.map((triage) => (
          <TriageCard key={`${triage.id}`} onPress={() => navigation.navigate('NurseTriageDetail', { triage, triageId: triage.id })} triage={triage} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    padding: 18,
    paddingBottom: 110,
  },
  counter: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  safe: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
