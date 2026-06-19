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
import { getPatientsInTriage } from '@/features/nurse/services/nurseApi';
import type { NursePatientSummary } from '@/features/nurse/types/nurse.types';

export function NursePatientsInTriageScreen() {
  const navigation = useNavigation<any>();
  const [patients, setPatients] = useState<NursePatientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setPatients(await getPatientsInTriage());
    } catch {
      setError('No se pudieron cargar pacientes en triaje.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading) return <LoadingState label="Cargando pacientes..." />;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => { setRefreshing(true); void load(); }} refreshing={refreshing} />}>
        <AppHeader icon="account-heart-outline" subtitle="Pacientes con triaje iniciado." title="Pacientes en triaje" />
        {error ? <ErrorState message={error} title="Pacientes no disponibles" /> : null}
        {!error && patients.length === 0 ? <EmptyState description="No hay pacientes en triaje." title="Sin pacientes" /> : null}
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
