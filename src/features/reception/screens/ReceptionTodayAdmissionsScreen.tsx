import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { AppInput } from '@/components/AppInput';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { TodayAdmissionCard } from '@/features/reception/components/TodayAdmissionCard';
import { getTodayAdmissions } from '@/features/reception/services/receptionAdmissionService';
import { visitDoctorName, visitPatientName } from '@/features/reception/services/receptionMappers';
import type { ReceptionVisit } from '@/features/reception/types/receptionAdmission.types';

const filters = [['all', 'Todas'], ['waiting_triage', 'Triaje'], ['in_triage', 'En triaje'], ['waiting_doctor', 'Medico'], ['in_consultation', 'Consulta'], ['waiting_billing', 'Caja'], ['completed', 'Finalizadas'], ['cancelled', 'Canceladas']] as const;

export function ReceptionTodayAdmissionsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const initialFilter = String(route.params?.initialFilter ?? 'all');
  const [visits, setVisits] = useState<ReceptionVisit[]>([]);
  const [filter, setFilter] = useState(initialFilter);
  const [search, setSearch] = useState('');
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
  useEffect(() => {
    if (initialFilter && initialFilter !== filter) setFilter(initialFilter);
  }, [filter, initialFilter]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return visits.filter((item) => {
      if (filter !== 'all' && visitFilterKey(item) !== filter) return false;
      if (!needle) return true;
      const searchable = [
        visitPatientName(item),
        visitDoctorName(item),
        item.reason,
        item.visit_number,
        item.priority,
        item.status,
      ].join(' ').toLowerCase();
      return searchable.includes(needle);
    });
  }, [filter, search, visits]);

  if (loading) return <LoadingState label="Cargando admisiones..." />;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
        <AppHeader icon="clipboard-list-outline" subtitle="Visitas y admisiones registradas hoy." title="Admisiones de hoy" />
        <View style={styles.filters}>{filters.map(([value, label]) => <Text key={value} onPress={() => setFilter(value)} style={[styles.filter, filter === value && styles.filterActive]}>{label}</Text>)}</View>
        <AppInput autoCapitalize="none" label="Buscar admision" onChangeText={setSearch} placeholder="Paciente, medico, motivo o numero" value={search} />
        {error ? <ErrorState message={error} onRetry={() => void load()} title="No se pudo cargar" /> : null}
        {!error && visible.length === 0 ? <EmptyState description="Ajusta el filtro o registra una nueva admision." title="Sin admisiones" /> : null}
        {visible.map((visit) => <TodayAdmissionCard key={visit.id} onPress={() => navigation.navigate('ReceptionVisitDetail', { visitId: visit.id })} visit={visit} />)}
      </ScrollView>
    </SafeAreaView>
  );
}

function visitFilterKey(visit: ReceptionVisit) {
  const status = String(visit.status ?? '').toLowerCase();
  if (status.includes('cancel') || status.includes('anulad')) return 'cancelled';
  if (status.includes('complete') || status.includes('final') || status.includes('paid')) return 'completed';
  if (status.includes('billing') || status.includes('payment') || status.includes('caja') || status.includes('pago')) return 'waiting_billing';
  if (status.includes('consult')) return 'in_consultation';
  if (status.includes('doctor') || status.includes('medic')) return 'waiting_doctor';
  if (status.includes('in_triage') || status.includes('en_triaje')) return 'in_triage';
  if (status.includes('triage') || status.includes('triaje')) return 'waiting_triage';
  return status || 'waiting_triage';
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 18, paddingBottom: 120 },
  filter: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: 999, borderWidth: 1, color: colors.muted, fontSize: 12, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 9 },
  filterActive: { backgroundColor: colors.primary, borderColor: colors.primary, color: colors.white },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  safe: { backgroundColor: colors.background, flex: 1 },
});
