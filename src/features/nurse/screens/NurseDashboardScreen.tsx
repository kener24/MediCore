import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { QuickActionCard } from '@/components/QuickActionCard';
import { StatCard } from '@/components/StatCard';
import { colors } from '@/core/theme/colors';
import { useAuth } from '@/features/auth/context/AuthContext';
import { getNurseDashboard } from '@/features/nurse/services/nurseApi';
import type { NurseDashboardSummary } from '@/features/nurse/types/nurse.types';

export function NurseDashboardScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [summary, setSummary] = useState<NurseDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setSummary(await getNurseDashboard());
    } catch {
      setError('Este módulo aún no está disponible.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (loading) return <LoadingState label="Cargando enfermería..." />;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => { setRefreshing(true); void load(); }} refreshing={refreshing} />}>
        <AppHeader
          icon="heart-pulse"
          subtitle={`${user?.nombre_completo || 'Enfermería'} · Triaje inicial, signos vitales y seguimiento operativo.`}
          title="Panel de enfermería"
        />
        {error ? <ErrorState message={error} title="Sin conexión con triaje" /> : null}
        {summary ? (
          <View style={styles.stats}>
            <StatCard icon="account-clock-outline" label="En espera" value={String(summary.waitingCount)} />
            <StatCard icon="clipboard-pulse-outline" label="En triaje" tone="blue" value={String(summary.inTriageCount)} />
            <StatCard icon="check-circle-outline" label="Completados" tone="primary" value={String(summary.completedTodayCount)} />
            <StatCard icon="alert-outline" label="Prioritarios" tone="warning" value={String(summary.priorityCount)} />
          </View>
        ) : (
          <EmptyState description="No hay datos de enfermería para mostrar." title="Sin actividad" />
        )}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acciones rápidas</Text>
          <QuickActionCard
            description="Pacientes pendientes de evaluación inicial."
            icon="clipboard-account-outline"
            onPress={() => navigation.navigate('NurseTriageQueue')}
            title="Cola de triaje"
          />
          <QuickActionCard
            description="Registrar signos vitales desde el detalle del paciente."
            icon="heart-pulse"
            onPress={() => navigation.navigate('NurseTriageQueue')}
            title="Registrar signos vitales"
          />
          <QuickActionCard
            description="Revisar triajes finalizados recientemente."
            icon="format-list-checks"
            onPress={() => navigation.navigate('NurseCompletedTriages')}
            title="Triajes realizados"
          />
          <QuickActionCard
            description={`${summary?.unreadNotifications ?? 0} notificaciones no leídas.`}
            icon="bell-outline"
            onPress={() => navigation.navigate('NurseNotifications')}
            title="Notificaciones"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 18,
    padding: 18,
    paddingBottom: 110,
  },
  safe: {
    backgroundColor: colors.background,
    flex: 1,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
});
