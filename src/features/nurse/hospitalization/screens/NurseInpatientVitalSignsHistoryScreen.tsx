import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { InpatientVitalSignsCard } from '@/features/nurse/hospitalization/components/HospitalizationCards';
import { getInpatientVitalSigns } from '@/features/nurse/hospitalization/services/nurseHospitalizationService';
import type { InpatientVitalSigns, VitalSignsFilter } from '@/features/nurse/hospitalization/types/nurseHospitalization.types';

const filters: { label: string; value: VitalSignsFilter }[] = [
  { label: 'Hoy', value: 'today' },
  { label: 'Últimas 24 horas', value: '24h' },
  { label: 'Todos', value: 'all' },
];

export function NurseInpatientVitalSignsHistoryScreen() {
  const route = useRoute<any>();
  const hospitalizationId = Number(route.params?.hospitalizationId);
  const [items, setItems] = useState<InpatientVitalSigns[]>([]);
  const [filter, setFilter] = useState<VitalSignsFilter>('today');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setItems(await getInpatientVitalSigns(hospitalizationId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el historial de signos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hospitalizationId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    const now = Date.now();
    return items.filter((item) => {
      const date = new Date(item.recorded_at ?? item.creado_en ?? item.created_at ?? '').getTime();
      if (Number.isNaN(date)) return true;
      if (filter === '24h') return now - date <= 24 * 60 * 60 * 1000;
      return new Date(date).toDateString() === new Date().toDateString();
    });
  }, [filter, items]);

  if (loading) return <LoadingState label="Cargando signos hospitalarios..." />;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
        <AppHeader icon="heart-pulse" subtitle="Historial de signos vitales hospitalarios." title="Signos hospitalarios" />
        <FilterBar current={filter} filters={filters} onChange={setFilter} />
        {error ? <ErrorState message={error} onRetry={() => void load()} title="No se pudieron cargar los signos" /> : null}
        {!error && filtered.length === 0 ? <EmptyState description="No hay signos vitales hospitalarios registrados." title="Sin signos" /> : null}
        {filtered.map((item) => <InpatientVitalSignsCard item={item} key={item.id ?? `${item.recorded_at}`} />)}
      </ScrollView>
    </SafeAreaView>
  );
}

function FilterBar<T extends string>({ current, filters, onChange }: { current: T; filters: { label: string; value: T }[]; onChange: (value: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.filters}>
        {filters.map((item) => (
          <Pressable key={item.value} onPress={() => onChange(item.value)} style={[styles.filter, current === item.value && styles.filterActive]}>
            <Text style={[styles.filterText, current === item.value && styles.filterTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
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
