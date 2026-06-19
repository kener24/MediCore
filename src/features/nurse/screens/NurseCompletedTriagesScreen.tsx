import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { TriageCard } from '@/features/nurse/components/NurseCards';
import { getCompletedTriages } from '@/features/nurse/services/nurseApi';
import type { NurseTriage } from '@/features/nurse/types/nurse.types';

export function NurseCompletedTriagesScreen() {
  const navigation = useNavigation<any>();
  const [triages, setTriages] = useState<NurseTriage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setTriages(await getCompletedTriages());
    } catch {
      setError('No se pudieron cargar los triajes realizados.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading) return <LoadingState label="Cargando triajes..." />;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => { setRefreshing(true); void load(); }} refreshing={refreshing} />}>
        <AppHeader icon="format-list-checks" subtitle="Evaluaciones iniciales finalizadas." title="Triajes realizados" />
        {error ? <ErrorState message={error} title="Triajes no disponibles" /> : null}
        {!error && triages.length === 0 ? <EmptyState description="No hay triajes completados." title="Sin registros" /> : null}
        {triages.map((triage) => (
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
  safe: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
