import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { QuickActionCard } from '@/components/QuickActionCard';
import { colors } from '@/core/theme/colors';
import { useAuth } from '@/features/auth/context/AuthContext';
import { HospitalizationSummaryCard } from '@/features/nurse/hospitalization/components/HospitalizationCards';
import { getHospitalizationDashboard } from '@/features/nurse/hospitalization/services/nurseHospitalizationService';
import type { NurseHospitalizationDashboard } from '@/features/nurse/hospitalization/types/nurseHospitalization.types';

export function NurseHospitalizationDashboardScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [summary, setSummary] = useState<NurseHospitalizationDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setSummary(await getHospitalizationDashboard());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar hospitalización.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading) return <LoadingState label="Cargando hospitalización..." />;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}
        showsVerticalScrollIndicator={false}>
        <AppHeader
          icon="hospital-building"
          subtitle={`${user?.nombre_completo || 'Enfermería'} · Seguimiento de pacientes internados.`}
          title="Hospitalización"
        />
        {error ? <ErrorState message={error} onRetry={() => void load()} title="Hospitalización no disponible" /> : null}
        {!error && summary ? <HospitalizationSummaryCard summary={summary} /> : null}
        {!error && !summary ? <EmptyState description="No hay datos de hospitalización para mostrar." title="Sin actividad" /> : null}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accesos rápidos</Text>
          <QuickActionCard description="Ver pacientes con internamiento activo u observación." icon="account-injury-outline" onPress={() => navigation.navigate('NurseInpatients')} title="Pacientes internados" />
          <QuickActionCard description="Abrir pacientes para registrar signos vitales hospitalarios." icon="heart-pulse" onPress={() => navigation.navigate('NurseInpatients', { intent: 'vitals' })} title="Registrar signos hospitalarios" />
          <QuickActionCard description="Crear notas desde el detalle del internamiento." icon="note-plus-outline" onPress={() => navigation.navigate('NurseInpatients', { intent: 'note' })} title="Crear nota de enfermería" />
          <QuickActionCard description="Revisar disponibilidad, limpieza y mantenimiento." icon="bed" onPress={() => navigation.navigate('NurseBedStatus')} title="Estado de camas" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 18, padding: 18, paddingBottom: 110 },
  safe: { backgroundColor: colors.background, flex: 1 },
  section: { gap: 12 },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: '900' },
});
