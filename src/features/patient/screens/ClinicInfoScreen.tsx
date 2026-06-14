import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { ClinicInfoCard } from '@/features/patient/components/ClinicInfoCard';
import { PatientHeader } from '@/features/patient/components/PatientHeader';
import { getClinicInfo } from '@/features/patient/services/patientClinicService';
import type { PatientClinicInfo } from '@/features/patient/types/patientClinic.types';

export function ClinicInfoScreen() {
  const [clinic, setClinic] = useState<PatientClinicInfo | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setClinic(await getClinicInfo());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la informacion.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <LoadingState label="Cargando clinica..." />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => load(true)} refreshing={refreshing} />}
        showsVerticalScrollIndicator={false}>
        <PatientHeader subtitle="Informacion publica de tu clinica." title="Clinica" />
        {error ? (
          <ErrorState message={error} onRetry={() => load()} title="No se pudo cargar la clinica" />
        ) : clinic ? (
          <ClinicInfoCard clinic={clinic} />
        ) : (
          <EmptyState description="No hay datos disponibles." title="Sin informacion" />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 22, paddingBottom: 34 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
});
