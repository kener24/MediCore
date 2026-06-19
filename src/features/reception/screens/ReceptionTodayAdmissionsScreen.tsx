import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { TodayAdmissionCard } from '@/features/reception/components/TodayAdmissionCard';
import { getTodayAdmissions } from '@/features/reception/services/receptionAdmissionService';
import type { ReceptionVisit } from '@/features/reception/types/receptionAdmission.types';

const filters = [['all', 'Todas'], ['waiting_triage', 'Triaje'], ['in_triage', 'En triaje'], ['waiting_doctor', 'Médico'], ['in_consultation', 'Consulta'], ['completed', 'Finalizadas'], ['cancelled', 'Canceladas']] as const;

export function ReceptionTodayAdmissionsScreen() {
  const navigation = useNavigation<any>();
  const [visits, setVisits] = useState<ReceptionVisit[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setVisits(await getTodayAdmissions());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las admisiones.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const visible = useMemo(() => filter === 'all' ? visits : visits.filter((item) => item.status === filter), [filter, visits]);
  if (loading) return <LoadingState label="Cargando admisiones..." />;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
        <AppHeader icon="clipboard-list-outline" subtitle="Visitas y admisiones registradas hoy." title="Admisiones de hoy" />
        <View style={styles.filters}>{filters.map(([value, label]) => <Text key={value} onPress={() => setFilter(value)} style={[styles.filter, filter === value && styles.filterActive]}>{label}</Text>)}</View>
        {error ? <ErrorState message={error} onRetry={() => void load()} title="No se pudo cargar" /> : null}
        {!error && visible.length === 0 ? <EmptyState description="Las admisiones registradas aparecerán aquí." title="Sin admisiones" /> : null}
        {visible.map((visit) => <TodayAdmissionCard key={visit.id} onPress={() => navigation.navigate('ReceptionVisitDetail', { visitId: visit.id })} visit={visit} />)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 18, paddingBottom: 120 },
  filter: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: 999, borderWidth: 1, color: colors.muted, fontSize: 12, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 9 },
  filterActive: { backgroundColor: colors.primary, borderColor: colors.primary, color: colors.white },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  safe: { backgroundColor: colors.background, flex: 1 },
});
