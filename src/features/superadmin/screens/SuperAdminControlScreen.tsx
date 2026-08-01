import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { RoleGuard } from '@/components/RoleGuard';
import { StatCard } from '@/components/StatCard';
import { colors } from '@/core/theme/colors';
import { formatDateTime } from '@/features/cashier/types/commonCashier.types';
import { getManagedSessions, revokeManagedSession, type ManagedSession } from '@/features/security/services/sessionService';
import { getSuperAdminAuditLogs, getSuperAdminDashboard, getSuperAdminSubscriptions } from '@/features/superadmin/services/superAdminService';
import type { SuperAdminAuditLog, SuperAdminDashboard } from '@/features/superadmin/types/superAdmin.types';

export function SuperAdminControlScreen() {
  const [dashboard, setDashboard] = useState<SuperAdminDashboard | null>(null);
  const [audit, setAudit] = useState<SuperAdminAuditLog[]>([]);
  const [subscriptions, setSubscriptions] = useState<Record<string, unknown>[]>([]);
  const [sessions, setSessions] = useState<ManagedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [nextDashboard, nextAudit, nextSubscriptions, nextSessions] = await Promise.all([
        getSuperAdminDashboard(),
        getSuperAdminAuditLogs().catch(() => []),
        getSuperAdminSubscriptions().catch(() => []),
        getManagedSessions().catch(() => []),
      ]);
      setDashboard(nextDashboard);
      setAudit(nextAudit);
      setSubscriptions(nextSubscriptions);
      setSessions(nextSessions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el control global.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const confirmRevoke = useCallback((session: ManagedSession) => {
    Alert.alert('Cerrar sesión remota', `¿Deseas cerrar la sesión de ${session.user_email ?? session.user_nombre ?? 'este usuario'}?`, [
      { style: 'cancel', text: 'Cancelar' },
      {
        style: 'destructive',
        text: 'Cerrar sesión',
        onPress: () => void revokeManagedSession(session.id)
          .then(() => load(true))
          .catch((err) => Alert.alert('No se pudo cerrar', err instanceof Error ? err.message : 'Intenta nuevamente.')),
      },
    ]);
  }, [load]);

  if (loading) return <LoadingState label="Cargando auditoría..." />;

  return (
    <RoleGuard roles={['superadmin']}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
          <AppHeader icon="chart-timeline-variant" subtitle="Auditoría, sesiones y señales centrales del SaaS." title="Control global" />
          {error ? <ErrorState message={error} onRetry={() => void load()} title="Control no disponible" /> : null}
          <View style={styles.stats}>
            <StatCard icon="domain-off" label="Clínicas inactivas" tone="warning" value={String(dashboard?.inactive_clinics ?? 0)} />
            <StatCard icon="account-off-outline" label="Usuarios inactivos" tone="blue" value={String(dashboard?.inactive_users ?? 0)} />
            <StatCard icon="card-account-details-star-outline" label="Admins" value={String(dashboard?.total_admins ?? 0)} />
          </View>
          <AppCard style={styles.card}>
            <Text style={styles.title}>Suscripciones</Text>
            <Text style={styles.meta}>{subscriptions.length} registros disponibles para revisión global.</Text>
          </AppCard>
          <Text style={styles.sectionTitle}>Sesiones activas</Text>
          {sessions.length === 0 ? <EmptyState description="No hay sesiones activas para cerrar remotamente." title="Sin sesiones activas" /> : null}
          {sessions.slice(0, 8).map((session) => (
            <AppCard key={session.id} style={styles.card}>
              <Text style={styles.title}>{session.user_nombre || session.user_email || 'Usuario'}</Text>
              <Text style={styles.meta}>{session.device_name || 'Dispositivo'} · {session.platform || 'Plataforma no identificada'}</Text>
              <Text style={styles.meta}>{session.location_hint || 'Ubicación protegida'}</Text>
              <Text style={styles.meta}>Última actividad: {formatDateTime(session.last_activity_at)}</Text>
              <AppButton disabled={!session.active || session.current} label={session.current ? 'Sesión actual' : 'Cerrar sesión'} onPress={() => confirmRevoke(session)} variant="danger" />
            </AppCard>
          ))}
          <Text style={styles.sectionTitle}>Auditoría reciente</Text>
          {audit.length === 0 ? <EmptyState description="No se encontraron eventos recientes." title="Sin auditoría" /> : null}
          {audit.map((log) => (
            <AppCard key={log.id} style={styles.card}>
              <Text style={styles.title}>{log.description || `${log.module ?? 'Sistema'} / ${log.action ?? 'evento'}`}</Text>
              <Text style={styles.meta}>{log.user_email || 'Sistema'} · {formatDateTime(log.created_at)}</Text>
              <Text style={styles.meta}>Estado: {log.status ?? 'success'} · Severidad: {log.severity ?? 'info'}</Text>
            </AppCard>
          ))}
        </ScrollView>
      </SafeAreaView>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 6 },
  content: { gap: 14, padding: 18, paddingBottom: 120 },
  meta: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  safe: { backgroundColor: colors.background, flex: 1 },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  title: { color: colors.ink, fontSize: 15, fontWeight: '900' },
});
