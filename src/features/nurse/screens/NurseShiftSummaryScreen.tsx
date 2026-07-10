import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { StatCard } from '@/components/StatCard';
import { colors } from '@/core/theme/colors';
import { getPendingMedications } from '@/features/nurse/hospitalization/services/nurseHospitalizationService';
import { getCompletedTriages, getNurseDashboard, getPatientsInTriage, getTriageQueue } from '@/features/nurse/services/nurseApi';
import type { NurseDashboardSummary } from '@/features/nurse/types/nurse.types';

export function NurseShiftSummaryScreen() {
  const navigation = useNavigation<any>();
  const [summary, setSummary] = useState<NurseDashboardSummary | null>(null);
  const [pendingMeds, setPendingMeds] = useState(0);
  const [inTriage, setInTriage] = useState(0);
  const [waiting, setWaiting] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [dashboard, queue, active, done, medications] = await Promise.all([
        getNurseDashboard(),
        getTriageQueue().catch(() => []),
        getPatientsInTriage().catch(() => []),
        getCompletedTriages().catch(() => []),
        getPendingMedications().catch(() => []),
      ]);
      setSummary(dashboard);
      setWaiting(queue.length);
      setInTriage(active.length);
      setCompleted(done.length);
      setPendingMeds(medications.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el resumen del turno.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading) return <LoadingState label="Preparando resumen..." />;

  const goTabStack = (tab: string, screen: string) => {
    const parent = navigation.getParent?.();
    if (parent) {
      parent.navigate(tab, { screen });
      return;
    }
    navigation.navigate(tab, { screen });
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
        <AppHeader icon="clipboard-text-clock-outline" subtitle="Vista operativa para cierre o continuidad de turno." title="Resumen de turno" />
        {error ? <ErrorState message={error} onRetry={() => void load()} title="Resumen no disponible" /> : null}
        <View style={styles.stats}>
          <StatCard icon="account-clock-outline" label="Esperando" value={String(waiting || summary?.waitingCount || 0)} />
          <StatCard icon="clipboard-pulse-outline" label="En triaje" tone="blue" value={String(inTriage || summary?.inTriageCount || 0)} />
          <StatCard icon="check-circle-outline" label="Completados" tone="primary" value={String(completed || summary?.completedTodayCount || 0)} />
          <StatCard icon="pill" label="Medicamentos" tone="warning" value={String(pendingMeds)} />
        </View>
        <AppCard style={styles.card}>
          <Text style={styles.title}>Prioridades</Text>
          <Text style={styles.body}>{summary?.priorityCount ?? 0} pacientes marcados como prioritarios o urgentes.</Text>
          <Text style={styles.body}>{summary?.unreadNotifications ?? 0} notificaciones pendientes de revisar.</Text>
        </AppCard>
        <AppCard style={styles.card}>
          <Text style={styles.title}>Acciones sugeridas</Text>
          <Text style={styles.body}>1. Revisa primero los pacientes urgentes en cola.</Text>
          <Text style={styles.body}>2. Completa signos vitales antes de enviar al médico.</Text>
          <Text style={styles.body}>3. Confirma medicamentos pendientes antes de cerrar turno.</Text>
        </AppCard>
        <View style={styles.actions}>
          <AppButton label="Ir a cola de triaje" onPress={() => goTabStack('NurseTriageTab', 'NurseTriageQueue')} />
          <AppButton label="Medicamentos pendientes" onPress={() => goTabStack('NurseHospitalizationTab', 'NursePendingMedications')} variant="secondary" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 10,
  },
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  card: {
    gap: 8,
  },
  content: {
    gap: 16,
    padding: 18,
    paddingBottom: 120,
  },
  safe: {
    backgroundColor: colors.background,
    flex: 1,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  title: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
});
