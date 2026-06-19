import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { BedCard } from '@/features/nurse/hospitalization/components/HospitalizationCards';
import { getBedStatus } from '@/features/nurse/hospitalization/services/nurseHospitalizationService';
import type { BedStatus, HospitalBed } from '@/features/nurse/hospitalization/types/nurseHospitalization.types';

const statuses: { label: string; value: BedStatus | 'all' }[] = [
  { label: 'Todas', value: 'all' },
  { label: 'Disponibles', value: 'available' },
  { label: 'Ocupadas', value: 'occupied' },
  { label: 'Limpieza', value: 'cleaning' },
  { label: 'Mantenimiento', value: 'maintenance' },
  { label: 'Bloqueadas', value: 'blocked' },
];

export function NurseBedStatusScreen() {
  const [beds, setBeds] = useState<HospitalBed[]>([]);
  const [filter, setFilter] = useState<BedStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setBeds(await getBedStatus());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el estado de camas.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const filtered = useMemo(() => filter === 'all' ? beds : beds.filter((bed) => bed.status === filter), [beds, filter]);

  if (loading) return <LoadingState label="Cargando camas..." />;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
        <AppHeader icon="bed" subtitle="Consulta operativa de camas hospitalarias." title="Estado de camas" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filters}>
            {statuses.map((item) => (
              <Pressable key={item.value} onPress={() => setFilter(item.value)} style={[styles.filter, filter === item.value && styles.filterActive]}>
                <Text style={[styles.filterText, filter === item.value && styles.filterTextActive]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        {error ? <ErrorState message={error} onRetry={() => void load()} title="No se pudieron cargar las camas" /> : null}
        {!error && filtered.length === 0 ? <EmptyState description="No hay camas para este estado." title="Sin camas" /> : null}
        {filtered.map((bed) => <BedCard bed={bed} key={bed.id ?? bed.bed_code} />)}
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
