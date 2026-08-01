import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import {
  getAdminAccountLocks,
  getAdminAuditLogsFiltered,
  getAdminClinicReport,
  getAdminFinancialReport,
  getAdminSubscription,
  getAdminUsage,
  unlockAdminAccountLock,
} from '@/features/admin/services/adminService';
import type { AdminAccountLock, AdminAuditLog, AdminReportSummary, AdminSubscription, AdminUsage } from '@/features/admin/types/admin.types';
import { formatCurrency, formatDateTime } from '@/features/cashier/types/commonCashier.types';
import { getManagedSessions, type ManagedSession } from '@/features/security/services/sessionService';

const severityFilters = ['Todas', 'info', 'warning', 'error'] as const;
type SeverityFilter = (typeof severityFilters)[number];

export function AdminReportsScreen() {
  const [clinicReport, setClinicReport] = useState<AdminReportSummary | null>(null);
  const [financialReport, setFinancialReport] = useState<AdminReportSummary | null>(null);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [subscription, setSubscription] = useState<AdminSubscription | null>(null);
  const [usage, setUsage] = useState<AdminUsage | null>(null);
  const [sessions, setSessions] = useState<ManagedSession[]>([]);
  const [locks, setLocks] = useState<AdminAccountLock[]>([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [severity, setSeverity] = useState<SeverityFilter>('Todas');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [clinic, financial, audit, sub, planUsage, activeSessions, activeLocks] = await Promise.all([
        getAdminClinicReport().catch(() => null),
        getAdminFinancialReport().catch(() => null),
        getAdminAuditLogsFiltered().catch(() => []),
        getAdminSubscription(),
        getAdminUsage(),
        getManagedSessions({ active: true }).catch(() => []),
        getAdminAccountLocks({ active: true }).catch(() => []),
      ]);
      setClinicReport(clinic);
      setFinancialReport(financial);
      setAuditLogs(audit);
      setSubscription(sub);
      setUsage(planUsage);
      setSessions(activeSessions);
      setLocks(activeLocks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar reportes administrativos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const filteredAudit = useMemo(() => {
    const term = auditSearch.trim().toLowerCase();
    return auditLogs.filter((log) => {
      const matchesSeverity = severity === 'Todas' || String(log.severity ?? '').toLowerCase() === severity;
      const matchesTerm = !term || [log.description, log.user_email, log.module, log.action, log.status].join(' ').toLowerCase().includes(term);
      return matchesSeverity && matchesTerm;
    });
  }, [auditLogs, auditSearch, severity]);

  const confirmUnlock = useCallback((lock: AdminAccountLock) => {
    Alert.alert('Desbloquear cuenta', `¿Deseas desbloquear a ${lock.user_email ?? lock.user_nombre ?? 'este usuario'}?`, [
      { style: 'cancel', text: 'Cancelar' },
      {
        text: 'Desbloquear',
        onPress: () => void unlockAdminAccountLock(lock.id)
          .then(() => load(true))
          .catch((err) => Alert.alert('No se pudo desbloquear', err instanceof Error ? err.message : 'Intenta nuevamente.')),
      },
    ]);
  }, [load]);

  if (loading) return <LoadingState label="Cargando reportes..." />;

  return (
    <RoleGuard roles={['admin']}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
          <AppHeader icon="chart-box-outline" subtitle="Finanzas, auditoría, sesiones, bloqueos y uso del sistema." title="Reportes y control" />
          {error ? <ErrorState message={error} onRetry={() => void load()} title="Reportes no disponibles" /> : null}

          <View style={styles.stats}>
            <StatCard icon="account-group-outline" label="Pacientes" value={String(clinicReport?.patients ?? usage?.patients ?? 0)} />
            <StatCard icon="calendar-today-outline" label="Citas" tone="blue" value={String(clinicReport?.appointments ?? usage?.appointments ?? 0)} />
            <StatCard icon="cash-register" label="Ingresos" tone="warning" value={formatCurrency(financialReport?.revenue ?? financialReport?.payments ?? 0)} />
            <StatCard icon="lock-alert-outline" label="Bloqueos" tone="warning" value={String(locks.length)} />
          </View>

          <AppCard style={styles.card}>
            <Text style={styles.title}>Suscripción</Text>
            <Text style={styles.meta}>Plan: {subscription?.plan_name ?? 'No disponible'}</Text>
            <Text style={styles.meta}>Estado: {subscription?.status ?? 'No disponible'}</Text>
            <Text style={styles.meta}>Vence: {subscription?.current_period_end ?? subscription?.ends_at ?? 'No disponible'}</Text>
            <Text style={styles.meta}>Uso usuarios: {String(usage?.users ?? 'No disponible')}</Text>
          </AppCard>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bloqueos activos</Text>
            {locks.length === 0 ? <EmptyState description="No hay usuarios bloqueados por intentos fallidos." title="Sin bloqueos" /> : null}
            {locks.map((lock) => (
              <AppCard key={lock.id} style={styles.auditCard}>
                <Text style={styles.auditTitle}>{lock.user_nombre || lock.user_email || 'Usuario'}</Text>
                <Text style={styles.meta}>{lock.reason || 'Bloqueo de cuenta'} · Intentos: {lock.failed_attempts ?? 0}</Text>
                <Text style={styles.meta}>Hasta: {formatDateTime(lock.locked_until)}</Text>
                <AppButton label="Desbloquear cuenta" onPress={() => confirmUnlock(lock)} variant="secondary" />
              </AppCard>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sesiones activas</Text>
            {sessions.length === 0 ? <EmptyState description="No hay sesiones activas en la clínica." title="Sin sesiones activas" /> : null}
            {sessions.map((session) => (
              <AppCard key={session.id} style={styles.auditCard}>
                <Text style={styles.auditTitle}>{session.user_nombre || session.user_email || 'Usuario'}</Text>
                <Text style={styles.meta}>{session.device_name || 'Dispositivo'} · {session.platform || 'Plataforma no identificada'}</Text>
                <Text style={styles.meta}>{session.location_hint || 'Ubicación protegida'}</Text>
                <Text style={styles.meta}>Última actividad: {formatDateTime(session.last_activity_at)}</Text>
                <Text style={styles.meta}>La revocación con motivo se realiza desde el detalle del usuario.</Text>
              </AppCard>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Auditoría</Text>
            <AppInput icon="magnify" label="Buscar auditoría" onChangeText={setAuditSearch} placeholder="Usuario, módulo o acción" value={auditSearch} />
            <View style={styles.filters}>
              {severityFilters.map((item) => (
                <Text key={item} onPress={() => setSeverity(item)} style={[styles.filter, severity === item && styles.filterActive, severity === item && styles.filterTextActive]}>
                  {item}
                </Text>
              ))}
            </View>
            {filteredAudit.length === 0 ? <EmptyState description="No se encontraron eventos con esos filtros." title="Sin auditoría" /> : null}
            {filteredAudit.map((log) => (
              <AppCard key={log.id} style={styles.auditCard}>
                <Text style={styles.auditTitle}>{log.description || `${log.module ?? 'Sistema'} / ${log.action ?? 'evento'}`}</Text>
                <Text style={styles.meta}>{log.user_email || 'Sistema'} · {formatDateTime(log.created_at)}</Text>
                <Text style={styles.meta}>Estado: {log.status ?? 'success'} · Severidad: {log.severity ?? 'info'}</Text>
              </AppCard>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  auditCard: {
    gap: 8,
  },
  auditTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  card: {
    gap: 7,
  },
  content: {
    gap: 16,
    padding: 18,
    paddingBottom: 120,
  },
  filter: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  filterActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTextActive: {
    color: colors.white,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  safe: {
    backgroundColor: colors.background,
    flex: 1,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
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
