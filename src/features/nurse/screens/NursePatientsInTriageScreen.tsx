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
import { getPatientsInTriage } from '@/features/nurse/services/nurseApi';
import type { NursePatientSummary } from '@/features/nurse/types/nurse.types';

type InTriageFilter = 'all' | 'urgent' | 'doctor';

const filters: { label: string; value: InTriageFilter }[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Urgentes', value: 'urgent' },
  { label: 'Con médico', value: 'doctor' },
];

export function NursePatientsInTriageScreen() {
  const navigation = useNavigation<any>();
  const [patients, setPatients] = useState<NursePatientSummary[]>([]);
  const [filter, setFilter] = useState<InTriageFilter>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setPatients(await getPatientsInTriage());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar pacientes en triaje.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return patients.filter((patient) => {
      const priority = String(patient.priority ?? '').toLowerCase();
      const matchesFilter =
        filter === 'all' ||
        (filter === 'urgent' && ['critical', 'urgent', 'critica', 'urgente', 'priority'].includes(priority)) ||
        (filter === 'doctor' && Boolean(patient.doctorName));
      const matchesSearch = !term || [patient.name, patient.document, patient.reason, patient.doctorName].filter(Boolean).join(' ').toLowerCase().includes(term);
      return matchesFilter && matchesSearch;
    });
  }, [filter, patients, search]);

  if (loading) return <LoadingState label="Cargando pacientes..." />;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => { setRefreshing(true); void load(); }} refreshing={refreshing} />}>
        <AppHeader icon="account-heart-outline" subtitle="Pacientes con triaje iniciado." title="Pacientes en triaje" />
        <Text style={styles.counter}>{filtered.length} de {patients.length} pacientes</Text>
        <SearchAndFilters filters={filters} onFilterChange={setFilter} onSearchChange={setSearch} search={search} searchLabel="Buscar paciente, documento, motivo o médico" selectedFilter={filter} />
        {error ? <ErrorState message={error} onRetry={() => void load()} title="Pacientes no disponibles" /> : null}
        {!error && filtered.length === 0 ? <EmptyState description="No hay pacientes en triaje con esos filtros." title="Sin pacientes" /> : null}
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
