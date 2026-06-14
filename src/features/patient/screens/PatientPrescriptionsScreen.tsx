import { useFocusEffect, useNavigation, type NavigationProp, type ParamListBase } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { PatientHeader } from '@/features/patient/components/PatientHeader';
import { PrescriptionCard } from '@/features/patient/components/PrescriptionCard';
import { getPatientPrescriptions } from '@/features/patient/services/patientPrescriptionsService';
import type { PatientPrescription } from '@/features/patient/types/patientPrescriptions.types';

export function PatientPrescriptionsScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [prescriptions, setPrescriptions] = useState<PatientPrescription[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setPrescriptions(await getPatientPrescriptions());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const visiblePrescriptions = useMemo(
    () =>
      prescriptions.filter((item) => {
        if (filter === 'all') return true;
        if (filter === 'active') return item.status === 'active' || item.status === 'emitida';
        return item.status === 'completed' || item.status === 'cancelled' || item.status === 'expired' || item.status === 'anulada';
      }),
    [filter, prescriptions],
  );

  if (loading) return <LoadingState label="Cargando recetas..." />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => load(true)} refreshing={refreshing} />}
        showsVerticalScrollIndicator={false}>
        <PatientHeader subtitle="Medicamentos e indicaciones autorizadas." title="Mis recetas" />
        <FilterTabs
          onChange={setFilter}
          options={[
            ['all', 'Todas'],
            ['active', 'Activas'],
            ['completed', 'Finalizadas'],
          ]}
          selected={filter}
        />
        {error ? (
          <ErrorState message={error} onRetry={() => load()} title="No se pudieron cargar las recetas" />
        ) : visiblePrescriptions.length ? (
          visiblePrescriptions.map((prescription) => (
            <PrescriptionCard
              key={prescription.id}
              prescription={prescription}
              onPress={() =>
                navigation.navigate('PatientPrescriptionDetail', { id: prescription.id })
              }
            />
          ))
        ) : (
          <EmptyState description="No tienes recetas registradas." title="Sin recetas" />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  activeFilter: {
    backgroundColor: colors.primary,
  },
  activeFilterText: {
    color: colors.white,
  },
  content: {
    gap: 12,
    padding: 22,
    paddingBottom: 34,
  },
  filter: {
    borderRadius: 12,
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 11,
  },
  filterText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  filters: {
    backgroundColor: '#E2E8F0',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 4,
    padding: 4,
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
});

function FilterTabs<T extends string>({
  onChange,
  options,
  selected,
}: {
  onChange: (value: T) => void;
  options: [T, string][];
  selected: T;
}) {
  return (
    <View style={styles.filters}>
      {options.map(([value, label]) => {
        const active = selected === value;
        return (
          <Pressable key={value} onPress={() => onChange(value)} style={[styles.filter, active && styles.activeFilter]}>
            <Text style={[styles.filterText, active && styles.activeFilterText]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
