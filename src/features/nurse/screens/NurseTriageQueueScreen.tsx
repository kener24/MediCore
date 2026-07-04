import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { PatientQueueCard } from '@/features/nurse/components/NurseCards';
import { getTriageQueue } from '@/features/nurse/services/nurseApi';
import type { NursePatientSummary } from '@/features/nurse/types/nurse.types';

export function NurseTriageQueueScreen() {
  const navigation = useNavigation<any>();
  const [patients, setPatients] = useState<NursePatientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setPatients(await getTriageQueue());
    } catch {
      setError('No se pudo cargar la cola de triaje.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading) return <LoadingState label="Cargando cola de triaje..." />;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => { setRefreshing(true); void load(); }} refreshing={refreshing} />}>
        <AppHeader icon="clipboard-account-outline" subtitle="Pacientes esperando evaluación inicial." title="Cola de triaje" />
        {error ? <ErrorState message={error} onRetry={() => void load()} title="Triaje no disponible" /> : null}
        {!error && patients.length === 0 ? <EmptyState description="No hay pacientes esperando triaje." title="Cola vacía" /> : null}
        {patients.map((patient) => (
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
  safe: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
