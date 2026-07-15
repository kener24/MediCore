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
import { PatientQueueCard } from '@/features/nurse/components/NurseCards';
import { getTriageQueue } from '@/features/nurse/services/nurseApi';
import type { NursePatientSummary } from '@/features/nurse/types/nurse.types';

type QueueFilter = 'all' | 'urgent' | 'normal' | 'low';

const filters: { label: string; value: QueueFilter }[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Urgentes', value: 'urgent' },
  { label: 'Normales', value: 'normal' },
  { label: 'Baja', value: 'low' },
];

function matchesFilter(patient: NursePatientSummary, filter: QueueFilter) {
  const priority = String(patient.priority ?? '').toLowerCase();
  if (filter === 'all') return true;
  if (filter === 'urgent') return ['critical', 'urgent', 'critica', 'urgente', 'priority', 'prioritario'].includes(priority);
  if (filter === 'normal') return !priority || priority === 'normal' || priority === 'preferential' || priority === 'preferente';
  return priority === 'low' || priority === 'baja';
}

function matchesSearch(patient: NursePatientSummary, search: string) {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  return [patient.name, patient.document, patient.reason, patient.doctorName, patient.phone].filter(Boolean).join(' ').toLowerCase().includes(term);
}

export function NurseTriageQueueScreen() {
  const navigation = useNavigation<any>();
  const [patients, setPatients] = useState<NursePatientSummary[]>([]);
  const [filter, setFilter] = useState<QueueFilter>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setPatients(await getTriageQueue());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la cola de triaje.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const filtered = useMemo(
    () => patients.filter((patient) => matchesFilter(patient, filter) && matchesSearch(patient, search)),
    [filter, patients, search],
  );

  if (loading) return <LoadingState label="Cargando cola de triaje..." />;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => { setRefreshing(true); void load(); }} refreshing={refreshing} />}>
        <AppHeader icon="clipboard-account-outline" subtitle="Pacientes esperando evaluación inicial." title="Cola de triaje" />
        <Text style={styles.counter}>{filtered.length} de {patients.length} pacientes</Text>
        <SearchAndFilters filters={filters} onFilterChange={setFilter} onSearchChange={setSearch} search={search} searchLabel="Buscar por paciente, documento, motivo o médico" selectedFilter={filter} />
        {error ? <ErrorState message={error} onRetry={() => void load()} title="Triaje no disponible" /> : null}
        {!error && filtered.length === 0 ? (
          <EmptyState
            description={search.trim() || filter !== 'all' ? 'Ajusta la búsqueda o cambia el filtro de prioridad para revisar la cola completa.' : 'No hay pacientes pendientes de triaje. Las nuevas admisiones aparecerán aquí automáticamente.'}
            icon="clipboard-check-outline"
            title={search.trim() || filter !== 'all' ? 'Sin pacientes para este filtro' : 'Cola de triaje vacía'}
            tone={search.trim() || filter !== 'all' ? 'warning' : 'success'}
          />
        ) : null}
        {filtered.map((patient) => (
          <PatientQueueCard
            key={`${patient.visitId ?? patient.id}`}
            onPress={() => navigation.navigate('NursePatientDetail', { patient, visitId: patient.visitId ?? patient.id })}
            patient={patient}
          />
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
