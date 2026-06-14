import { useFocusEffect, useNavigation, type NavigationProp, type ParamListBase } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
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

  if (loading) return <LoadingState label="Cargando recetas..." />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => load(true)} refreshing={refreshing} />}
        showsVerticalScrollIndicator={false}>
        <PatientHeader subtitle="Medicamentos e indicaciones autorizadas." title="Mis recetas" />
        {error ? (
          <ErrorState message={error} onRetry={() => load()} title="No se pudieron cargar las recetas" />
        ) : prescriptions.length ? (
          prescriptions.map((prescription) => (
            <PrescriptionCard
              key={prescription.id}
              prescription={prescription}
              onPress={() =>
                navigation.navigate('PatientPrescriptionDetail', { id: prescription.id })
              }
            />
          ))
        ) : (
          <EmptyState description="No hay recetas visibles para tu usuario." title="Sin recetas" />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
    padding: 22,
    paddingBottom: 34,
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
