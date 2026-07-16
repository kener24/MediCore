import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { toPositiveId } from '@/core/utils/idUtils';
import { NursingNoteCard } from '@/features/nurse/hospitalization/components/HospitalizationCards';
import { getNursingNotes } from '@/features/nurse/hospitalization/services/nurseHospitalizationService';
import type { NursingNote, NursingNotesFilter } from '@/features/nurse/hospitalization/types/nurseHospitalization.types';

const filters: { label: string; value: NursingNotesFilter }[] = [
  { label: 'Todas', value: 'all' },
  { label: 'Urgentes', value: 'urgent' },
  { label: 'Incidentes', value: 'incident' },
  { label: 'Hoy', value: 'today' },
];

export function NurseNursingNotesListScreen() {
  const route = useRoute<any>();
  const hospitalizationId = toPositiveId(route.params?.hospitalizationId);
  const [items, setItems] = useState<NursingNote[]>([]);
  const [filter, setFilter] = useState<NursingNotesFilter>('all');
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
      setItems(await getNursingNotes(hospitalizationId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las notas de enfermería.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hospitalizationId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const filtered = useMemo(() => items.filter((item) => {
    if (filter === 'all') return true;
    const type = String(item.note_type ?? item.priority ?? '').toLowerCase();
    if (filter === 'urgent') return type === 'urgent';
    if (filter === 'incident') return type === 'incident';
    const date = new Date(item.recorded_at ?? item.creado_en ?? item.created_at ?? '');
    return !Number.isNaN(date.getTime()) && date.toDateString() === new Date().toDateString();
  }), [filter, items]);

  if (loading) return <LoadingState label="Cargando notas de enfermería..." />;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
        <AppHeader icon="notebook-outline" subtitle="Notas recientes del internamiento." title="Notas de enfermería" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filters}>
            {filters.map((item) => (
              <Pressable key={item.value} onPress={() => setFilter(item.value)} style={[styles.filter, filter === item.value && styles.filterActive]}>
                <Text style={[styles.filterText, filter === item.value && styles.filterTextActive]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        {error ? <ErrorState message={error} onRetry={() => void load()} title="No se pudieron cargar las notas" /> : null}
        {!error && filtered.length === 0 ? <EmptyState description="No hay notas de enfermería registradas." title="Sin notas" /> : null}
        {filtered.map((item) => <NursingNoteCard item={item} key={item.id ?? `${item.recorded_at}`} />)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 18, paddingBottom: 110 },
  filter: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 9 },
  filterActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  filterTextActive: { color: colors.white },
  filters: { flexDirection: 'row', gap: 8 },
  safe: { backgroundColor: colors.background, flex: 1 },
});
