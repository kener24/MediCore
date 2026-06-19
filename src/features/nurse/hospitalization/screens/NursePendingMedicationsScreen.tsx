import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { getPendingMedications } from '@/features/nurse/hospitalization/services/nurseHospitalizationService';
import type { MedicationAdministration } from '@/features/nurse/hospitalization/types/nurseHospitalization.types';
import { MedicationCard } from '@/features/nurse/hospitalization/screens/NurseMedicationAdministrationsScreen';

export function NursePendingMedicationsScreen() {
  const [items, setItems] = useState<MedicationAdministration[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try { setItems(await getPendingMedications()); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudieron cargar los medicamentos pendientes.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading) return <LoadingState label="Cargando pendientes..." />;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
        <AppHeader icon="pill" subtitle="Medicamentos pendientes o retrasados de la clínica." title="Medicamentos pendientes" />
        {error ? <ErrorState message={error} onRetry={() => void load()} title="No se pudieron cargar pendientes" /> : null}
        {!error && items.length === 0 ? <EmptyState description="No hay medicamentos pendientes." title="Sin pendientes" /> : null}
        {items.map((item) => <MedicationCard item={item} key={item.id ?? item.medication_name} />)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 18, paddingBottom: 110 },
  safe: { backgroundColor: colors.background, flex: 1 },
});
