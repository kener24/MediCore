import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { RoleGuard } from '@/components/RoleGuard';
import { StatCard } from '@/components/StatCard';
import { colors } from '@/core/theme/colors';
import { AdminStatusCard } from '@/features/admin/components/AdminCards';
import { getAdminDashboard, getAdminFiscalReadiness, getAdminFiscalRanges } from '@/features/admin/services/adminService';
import type { AdminDashboard, AdminFiscalRange, AdminFiscalReadiness } from '@/features/admin/types/admin.types';

export function AdminDashboardScreen() {
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [readiness, setReadiness] = useState<AdminFiscalReadiness | null>(null);
  const [ranges, setRanges] = useState<AdminFiscalRange[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [nextDashboard, nextReadiness, nextRanges] = await Promise.all([
        getAdminDashboard(),
        getAdminFiscalReadiness().catch(() => null),
        getAdminFiscalRanges().catch(() => []),
      ]);
      setDashboard(nextDashboard);
      setReadiness(nextReadiness);
      setRanges(nextRanges);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el resumen administrativo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading) return <LoadingState label="Cargando resumen..." />;

  const fiscalReady = Boolean(readiness?.ready ?? readiness?.is_ready ?? (readiness?.profile_complete && readiness?.has_active_range));
  const activeRanges = ranges.filter((item) => item.is_active && !item.is_exhausted).length;

  return (
    <RoleGuard roles={['admin']}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
          <AppHeader icon="view-dashboard-outline" subtitle="Indicadores de gestión y riesgos visibles." title="Dashboard ejecutivo" />
          {error ? <ErrorState message={error} onRetry={() => void load()} title="Resumen no disponible" /> : null}

          <View style={styles.stats}>
            <StatCard icon="account-group-outline" label="Usuarios" value={String(dashboard?.total_users ?? 0)} />
            <StatCard icon="doctor" label="Médicos" tone="blue" value={String(dashboard?.total_medicos ?? 0)} />
            <StatCard icon="account-heart-outline" label="Enfermería" tone="warning" value={String(dashboard?.total_enfermeras ?? 0)} />
            <StatCard icon="desk" label="Recepción" value={String(dashboard?.total_recepcionistas ?? 0)} />
          </View>

          <AdminStatusCard
            description={fiscalReady ? `Facturación fiscal preparada. Rangos activos: ${activeRanges}.` : 'Revisa perfil fiscal, CAI y rangos antes de emitir facturas fiscales.'}
            icon={fiscalReady ? 'shield-check-outline' : 'alert-outline'}
            title={fiscalReady ? 'Fiscal listo' : 'Fiscal requiere revisión'}
            tone={fiscalReady ? 'primary' : 'warning'}
          />

          <AppCard style={styles.card}>
            <Text style={styles.title}>Distribución del equipo</Text>
            <Text style={styles.line}>Activos: {dashboard?.active_users ?? 0}</Text>
            <Text style={styles.line}>Inactivos: {dashboard?.inactive_users ?? 0}</Text>
            <Text style={styles.line}>Pacientes con acceso: {dashboard?.total_pacientes ?? 0}</Text>
          </AppCard>
        </ScrollView>
      </SafeAreaView>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 8,
  },
  content: {
    gap: 16,
    padding: 18,
    paddingBottom: 120,
  },
  line: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
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

