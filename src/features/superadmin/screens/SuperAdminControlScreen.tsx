import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { AppInput } from '@/components/AppInput';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { RoleGuard } from '@/components/RoleGuard';
import { StatCard } from '@/components/StatCard';
import { colors } from '@/core/theme/colors';
import { formatDateTime } from '@/features/cashier/types/commonCashier.types';
import { getManagedSessions, revokeManagedSession, type ManagedSession } from '@/features/security/services/sessionService';
import { getSuperAdminAlerts, getSuperAdminAuditLogs, getSuperAdminDashboard, getSuperAdminPlans, getSuperAdminSubscriptions, getSuperAdminSystemStatus, getSuperAdminUsage } from '@/features/superadmin/services/superAdminService';
import type { SuperAdminAlert, SuperAdminAuditLog, SuperAdminDashboard, SuperAdminPlan, SuperAdminSubscription, SuperAdminSystemStatus, SuperAdminUsage } from '@/features/superadmin/types/superAdmin.types';

export function SuperAdminControlScreen() {
  const navigation = useNavigation<any>();
  const [dashboard, setDashboard] = useState<SuperAdminDashboard | null>(null);
  const [audit, setAudit] = useState<SuperAdminAuditLog[]>([]);
  const [subscriptions, setSubscriptions] = useState<SuperAdminSubscription[]>([]);
  const [plans, setPlans] = useState<SuperAdminPlan[]>([]);
  const [alerts, setAlerts] = useState<SuperAdminAlert[]>([]);
  const [usage, setUsage] = useState<SuperAdminUsage[]>([]);
  const [system, setSystem] = useState<SuperAdminSystemStatus | null>(null);
  const [sessions, setSessions] = useState<ManagedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [sessionToRevoke, setSessionToRevoke] = useState<ManagedSession | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revoking, setRevoking] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [nextDashboard, nextAudit, nextSubscriptions, nextSessions, nextPlans, nextAlerts, nextUsage, nextSystem] = await Promise.all([
        getSuperAdminDashboard(),
        getSuperAdminAuditLogs().catch(() => []),
        getSuperAdminSubscriptions().catch(() => []),
        getManagedSessions().catch(() => []),
        getSuperAdminPlans().catch(() => []),
        getSuperAdminAlerts().catch(() => []),
        getSuperAdminUsage().catch(() => []),
        getSuperAdminSystemStatus().catch(() => null),
      ]);
      setDashboard(nextDashboard);
      setAudit(nextAudit);
      setSubscriptions(nextSubscriptions);
      setSessions(nextSessions);
      setPlans(nextPlans);
      setAlerts(nextAlerts);
      setUsage(nextUsage);
      setSystem(nextSystem);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el control global.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const confirmRevoke = useCallback((session: ManagedSession) => {
    setRevokeReason('');
    setSessionToRevoke(session);
  }, []);

  async function revokeSelectedSession() {
    if (!sessionToRevoke) return;
    if (revokeReason.trim().length < 5) return Alert.alert('Motivo obligatorio', 'Indica por qué se cerrará la sesión.');
    setRevoking(true);
    try {
      await revokeManagedSession(sessionToRevoke.id, revokeReason.trim());
      setSessionToRevoke(null);
      setRevokeReason('');
      await load(true);
    } catch (err) { Alert.alert('No se pudo cerrar', err instanceof Error ? err.message : 'Intenta nuevamente.'); }
    finally { setRevoking(false); }
  }

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
            <StatCard icon="alert-circle-outline" label="Alertas" tone="warning" value={String(alerts.length)} />
          </View>
          <Text style={styles.sectionTitle}>Estado operativo</Text>
          <AppCard style={styles.card}>
            <Text style={styles.title}>API: {system?.api ?? 'No disponible'}</Text>
            <Text style={styles.meta}>Base de datos: {system?.database ?? 'No disponible'}</Text>
            <Text style={styles.meta}>Backup: {system?.backup.status ?? 'Sin monitoreo confirmado'}</Text>
            <Text style={styles.meta}>Cola: {system?.task_queue ?? 'No configurada'} · Scheduler: {system?.scheduler ?? 'No configurado'}</Text>
          </AppCard>
          <AppButton label={`Gestionar planes (${plans.length})`} onPress={() => navigation.navigate('SuperAdminPlans')} />
          <AppCard style={styles.card}>
            <Text style={styles.title}>Suscripciones</Text>
            <Text style={styles.meta}>{subscriptions.length} registros disponibles para revisión global.</Text>
          </AppCard>
          {subscriptions.slice(0, 8).map((subscription) => (
            <AppCard key={subscription.id} style={styles.card}>
              <Text style={styles.title}>{subscription.clinic_nombre || `Clínica ${subscription.clinic}`}</Text>
              <Text style={styles.meta}>{subscription.plan_nombre || 'Sin plan'} · {subscription.status}</Text>
              <AppButton label="Gestionar suscripción" onPress={() => navigation.navigate('SuperAdminSubscriptionDetail', { clinicId: subscription.clinic })} variant="secondary" />
            </AppCard>
          ))}
          <Text style={styles.sectionTitle}>Alertas globales</Text>
          {alerts.length === 0 ? <EmptyState description="No hay alertas globales pendientes." title="Sin alertas" /> : null}
          {alerts.slice(0, 10).map((item) => <AppCard key={item.id} style={styles.card}><Text style={styles.title}>{item.clinic_name}</Text><Text style={styles.meta}>{item.message}</Text><Text style={styles.meta}>Severidad: {item.severity}</Text></AppCard>)}
          <Text style={styles.sectionTitle}>Uso por clínica</Text>
          {usage.slice(0, 8).map((item) => <AppCard key={item.clinic_id} style={styles.card}><Text style={styles.title}>{item.clinic_name}</Text><Text style={styles.meta}>{item.plan} · {item.status}</Text><Text style={styles.meta}>Usuarios {item.users_count}/{item.max_users} · Médicos {item.doctors_count}/{item.max_doctors}</Text><Text style={styles.meta}>Pacientes {item.patients_count}/{item.max_patients}</Text></AppCard>)}
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
        <Modal animationType="fade" onRequestClose={() => setSessionToRevoke(null)} transparent visible={Boolean(sessionToRevoke)}>
          <View style={styles.modalOverlay}><View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cerrar sesión remota</Text>
            <Text style={styles.meta}>{sessionToRevoke?.user_email ?? sessionToRevoke?.user_nombre ?? 'Administrador de clínica'}</Text>
            <AppInput label="Motivo obligatorio" multiline onChangeText={setRevokeReason} placeholder="Motivo de seguridad o administrativo" value={revokeReason} />
            <AppButton label="Cerrar sesión" loading={revoking} onPress={() => void revokeSelectedSession()} variant="danger" />
            <AppButton label="Cancelar" onPress={() => setSessionToRevoke(null)} variant="secondary" />
          </View></View>
        </Modal>
      </SafeAreaView>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 6 },
  content: { gap: 14, padding: 18, paddingBottom: 120 },
  meta: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  modalCard: { backgroundColor: colors.surface, borderRadius: 18, gap: 12, padding: 18, width: '92%' },
  modalOverlay: { alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.45)', flex: 1, justifyContent: 'center', padding: 18 },
  modalTitle: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  safe: { backgroundColor: colors.background, flex: 1 },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  title: { color: colors.ink, fontSize: 15, fontWeight: '900' },
});
