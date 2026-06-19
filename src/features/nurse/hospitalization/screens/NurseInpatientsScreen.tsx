import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { AppInput } from '@/components/AppInput';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { InpatientCard, resolveBedCode, resolvePatientName } from '@/features/nurse/hospitalization/components/HospitalizationCards';
import { getActiveInpatients } from '@/features/nurse/hospitalization/services/nurseHospitalizationService';
import type { HospitalizationFilter, NurseHospitalizationListItem } from '@/features/nurse/hospitalization/types/nurseHospitalization.types';

const filters: { label: string; value: HospitalizationFilter }[] = [
  { label: 'Activos', value: 'active' },
  { label: 'Observación', value: 'observation' },
  { label: 'Todos', value: 'all' },
];

export function NurseInpatientsScreen() {
  const navigation = useNavigation<any>();
  const [patients, setPatients] = useState<NurseHospitalizationListItem[]>([]);
  const [filter, setFilter] = useState<HospitalizationFilter>('active');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const params = filter === 'all' ? { active: true } : { status: filter };
      setPatients(await getActiveInpatients(params));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los pacientes internados.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return patients;
    return patients.filter((item) => [resolvePatientName(item), resolveBedCode(item), item.responsible_doctor_name, item.reason].filter(Boolean).join(' ').toLowerCase().includes(term));
  }, [patients, search]);

  if (loading) return <LoadingState label="Cargando pacientes internados..." />;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}
        showsVerticalScrollIndicator={false}>
        <AppHeader icon="account-injury-outline" subtitle="Seguimiento hospitalario de enfermería." title="Pacientes internados" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filters}>
            {filters.map((item) => (
              <Pressable key={item.value} onPress={() => setFilter(item.value)} style={[styles.filter, filter === item.value && styles.filterActive]}>
                <Text style={[styles.filterText, filter === item.value && styles.filterTextActive]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        <AppInput icon="magnify" label="Buscar por paciente, habitación o cama" onChangeText={setSearch} value={search} />
        {error ? <ErrorState message={error} onRetry={() => void load()} title="No se pudieron cargar los pacientes internados" /> : null}
        {!error && filtered.length === 0 ? <EmptyState description="No hay pacientes internados." title="Sin internados" /> : null}
        {filtered.map((item) => (
          <InpatientCard
            item={item}
            key={item.id}
            onAddNote={() => navigation.navigate('NurseNursingNoteForm', { hospitalizationId: item.id })}
            onPress={() => navigation.navigate('NurseHospitalizationDetail', { hospitalizationId: item.id })}
            onVitals={() => navigation.navigate('NurseInpatientVitalSignsForm', { hospitalizationId: item.id })}
          />
        ))}
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
