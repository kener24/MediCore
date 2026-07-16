import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { toPositiveId } from '@/core/utils/idUtils';
import { HospitalizationEventCard } from '@/features/nurse/hospitalization/components/HospitalizationCards';
import { getHospitalizationEvents } from '@/features/nurse/hospitalization/services/nurseHospitalizationService';
import type { HospitalizationEvent } from '@/features/nurse/hospitalization/types/nurseHospitalization.types';

export function NurseHospitalizationEventsScreen() {
  const route = useRoute<any>();
  const hospitalizationId = toPositiveId(route.params?.hospitalizationId);
  const [items, setItems] = useState<HospitalizationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (!hospitalizationId) {
      setError('No se encontró el internamiento.');
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setItems(await getHospitalizationEvents(hospitalizationId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los eventos de hospitalización.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hospitalizationId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading) return <LoadingState label="Cargando eventos..." />;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
        <AppHeader icon="timeline-clock-outline" subtitle="Timeline del internamiento." title="Eventos de hospitalización" />
        {error ? <ErrorState message={error} onRetry={() => void load()} title="No se pudieron cargar los eventos" /> : null}
        {!error && items.length === 0 ? <EmptyState description="No hay eventos registrados." title="Sin eventos" /> : null}
        {items.map((item) => <HospitalizationEventCard item={item} key={item.id ?? `${item.creado_en}`} />)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 18, paddingBottom: 110 },
  safe: { backgroundColor: colors.background, flex: 1 },
});
