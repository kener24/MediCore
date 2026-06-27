import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { useAuth } from '@/features/auth/context/AuthContext';
import { ReceptionStatsGrid } from '@/features/reception/components/ReceptionStatsGrid';
import { getReceptionDashboard } from '@/features/reception/services/receptionDashboardService';
import type { ReceptionStats } from '@/features/reception/types/receptionAdmission.types';

export function ReceptionDashboardScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [stats, setStats] = useState<ReceptionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setStats(await getReceptionDashboard());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar recepción.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading) return <LoadingState label="Cargando recepción..." />;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
        <AppHeader icon="desk" subtitle={`${user?.clinica_nombre ?? 'Clínica asignada'} · ${user?.nombre_completo ?? 'Recepción'}`} title="Recepción" />
        {error ? <ErrorState message={error} onRetry={() => void load()} title="No se pudo cargar el panel" /> : null}
        {stats ? <ReceptionStatsGrid stats={stats} /> : null}
        {!error && !stats ? <EmptyState description="Cuando existan citas o admisiones se mostrarán aquí." title="Sin datos de recepción" /> : null}
        <View style={styles.actions}>
          <QuickAction label="Buscar paciente" onPress={() => navigation.navigate('ReceptionPatientSearch')} />
          <QuickAction label="Crear paciente" onPress={() => navigation.navigate('ReceptionPatientCreate')} />
          <QuickAction label="Nueva admisión" onPress={() => navigation.navigate('ReceptionCreateAdmission')} />
          <QuickAction label="Check-in de cita" onPress={() => navigation.navigate('ReceptionAppointmentCheckIn')} />
          <QuickAction label="Admisiones de hoy" onPress={() => navigation.navigate('ReceptionTodayAdmissions')} />
          <QuickAction label="Caja y cobros" onPress={() => navigation.navigate('ReceptionCashierTab')} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickAction({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={styles.action}><Text style={styles.actionText}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  action: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, padding: 16 },
  actionText: { color: colors.ink, fontSize: 15, fontWeight: '900' },
  actions: { gap: 10 },
  content: { gap: 16, padding: 18, paddingBottom: 120 },
  safe: { backgroundColor: colors.background, flex: 1 },
});
