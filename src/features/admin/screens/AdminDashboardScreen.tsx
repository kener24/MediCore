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
import {
  getAdminAccountLocks,
  getAdminClinicReport,
  getAdminDashboard,
  getAdminFinancialReport,
  getAdminFiscalRanges,
  getAdminFiscalReadiness,
  getAdminRolePermissions,
  getAdminUsage,
} from '@/features/admin/services/adminService';
import type { AdminAccountLock, AdminDashboard, AdminFiscalRange, AdminFiscalReadiness, AdminReportSummary, AdminRolePermissions, AdminUsage } from '@/features/admin/types/admin.types';
import { formatCurrency } from '@/features/cashier/types/commonCashier.types';
import { getManagedSessions, type ManagedSession } from '@/features/security/services/sessionService';

export function AdminDashboardScreen() {
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [readiness, setReadiness] = useState<AdminFiscalReadiness | null>(null);
  const [ranges, setRanges] = useState<AdminFiscalRange[]>([]);
  const [permissions, setPermissions] = useState<AdminRolePermissions | null>(null);
  const [clinicReport, setClinicReport] = useState<AdminReportSummary | null>(null);
  const [financialReport, setFinancialReport] = useState<AdminReportSummary | null>(null);
  const [usage, setUsage] = useState<AdminUsage | null>(null);
  const [sessions, setSessions] = useState<ManagedSession[]>([]);
  const [locks, setLocks] = useState<AdminAccountLock[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [nextDashboard, nextReadiness, nextRanges, rolePermissions, nextClinicReport, nextFinancialReport, nextUsage, nextSessions, nextLocks] = await Promise.all([
        getAdminDashboard(),
        getAdminFiscalReadiness().catch(() => null),
        getAdminFiscalRanges().catch(() => []),
        getAdminRolePermissions().catch(() => null),
        getAdminClinicReport().catch(() => null),
        getAdminFinancialReport().catch(() => null),
        getAdminUsage().catch(() => null),
        getManagedSessions({ active: true }).catch(() => []),
        getAdminAccountLocks({ active: true }).catch(() => []),
      ]);
      setDashboard(nextDashboard);
      setReadiness(nextReadiness);
      setRanges(nextRanges);
      setPermissions(rolePermissions);
      setClinicReport(nextClinicReport);
      setFinancialReport(nextFinancialReport);
      setUsage(nextUsage);
      setSessions(nextSessions);
      setLocks(nextLocks);
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
  const expiringRanges = ranges.filter((range) => isExpiringSoon(range.expiration_date)).length;
  const exhaustedRanges = ranges.filter((range) => range.is_exhausted).length;
  const adminGroups = Object.entries(permissions?.admin ?? {}).slice(0, 3);
  const planLimit = Number(usage?.max_users ?? usage?.users_limit ?? usage?.limit_users ?? 0);
  const usedUsers = Number(usage?.users ?? dashboard?.total_users ?? 0);
  const planMessage = planLimit > 0 ? `${usedUsers}/${planLimit} usuarios del plan` : `${usedUsers} usuarios registrados`;

  return (
    <RoleGuard roles={['admin']}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
          <AppHeader icon="view-dashboard-outline" subtitle="Indicadores, riesgos y operación diaria de la clínica." title="Dashboard ejecutivo" />
          {error ? <ErrorState message={error} onRetry={() => void load()} title="Resumen no disponible" /> : null}

          <View style={styles.stats}>
            <StatCard icon="account-group-outline" label="Usuarios" value={String(dashboard?.total_users ?? 0)} />
            <StatCard icon="doctor" label="Médicos" tone="blue" value={String(dashboard?.total_medicos ?? 0)} />
            <StatCard icon="account-heart-outline" label="Enfermería" tone="warning" value={String(dashboard?.total_enfermeras ?? 0)} />
            <StatCard icon="desk" label="Recepción" value={String(dashboard?.total_recepcionistas ?? 0)} />
            <StatCard icon="calendar-today-outline" label="Citas" tone="blue" value={String(clinicReport?.appointments ?? usage?.appointments ?? 0)} />
            <StatCard icon="cash-register" label="Ingresos" tone="warning" value={formatCurrency(financialReport?.revenue ?? financialReport?.payments ?? 0)} />
          </View>

          <AdminStatusCard
            description={fiscalReady ? `Facturación fiscal preparada. Rangos activos: ${activeRanges}.` : 'Revisa perfil fiscal, CAI y rangos antes de emitir facturas fiscales.'}
            icon={fiscalReady ? 'shield-check-outline' : 'alert-outline'}
            title={fiscalReady ? 'Fiscal listo' : 'Fiscal requiere revisión'}
            tone={fiscalReady ? 'primary' : 'warning'}
          />

          <AppCard style={styles.card}>
            <Text style={styles.title}>Operación de clínica</Text>
            <Text style={styles.line}>Activos: {dashboard?.active_users ?? 0}</Text>
            <Text style={styles.line}>Inactivos: {dashboard?.inactive_users ?? 0}</Text>
            <Text style={styles.line}>Pacientes con acceso: {dashboard?.total_pacientes ?? 0}</Text>
            <Text style={styles.line}>Consultas registradas: {clinicReport?.consultations ?? 0}</Text>
            <Text style={styles.line}>Facturas: {clinicReport?.invoices ?? financialReport?.invoices ?? 0}</Text>
            <Text style={styles.line}>Bajo stock: {clinicReport?.low_stock ?? 0}</Text>
            <Text style={styles.line}>Uso de plan: {planMessage}</Text>
          </AppCard>

          <AppCard style={styles.card}>
            <Text style={styles.title}>Alertas administrativas</Text>
            <AlertLine danger={locks.length > 0} label={`${locks.length} cuenta(s) bloqueada(s) por seguridad.`} />
            <AlertLine danger={sessions.length > 12} label={`${sessions.length} sesión(es) activa(s) en la clínica.`} />
            <AlertLine danger={!fiscalReady} label={fiscalReady ? 'Fiscal listo para emisión.' : 'Configuración fiscal requiere revisión.'} />
            <AlertLine danger={expiringRanges > 0} label={`${expiringRanges} rango(s) CAI por vencer.`} />
            <AlertLine danger={exhaustedRanges > 0} label={`${exhaustedRanges} rango(s) CAI agotado(s).`} />
            <AlertLine danger={planLimit > 0 && usedUsers >= planLimit} label={planLimit > 0 ? `Límite de usuarios: ${usedUsers}/${planLimit}.` : 'No hay límite de usuarios reportado por el plan.'} />
          </AppCard>

          <AppCard style={styles.card}>
            <Text style={styles.title}>Permisos clave del administrador</Text>
            {adminGroups.length ? adminGroups.map(([group, values]) => (
              <View key={group} style={styles.permissionGroup}>
                <Text style={styles.permissionTitle}>{group}</Text>
                {values.slice(0, 4).map((permission) => <Text key={permission} style={styles.line}>• {permission}</Text>)}
              </View>
            )) : <Text style={styles.line}>No se pudo cargar el catálogo de permisos.</Text>}
          </AppCard>
        </ScrollView>
      </SafeAreaView>
    </RoleGuard>
  );
}

function AlertLine({ danger, label }: { danger: boolean; label: string }) {
  return <Text style={[styles.line, danger ? styles.lineDanger : styles.lineOk]}>{danger ? '!' : '✓'} {label}</Text>;
}

function isExpiringSoon(date?: string) {
  if (!date) return false;
  const expiration = new Date(`${date}T23:59:59`);
  if (Number.isNaN(expiration.getTime())) return false;
  const days = Math.ceil((expiration.getTime() - Date.now()) / 86_400_000);
  return days >= 0 && days <= 15;
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
    lineHeight: 20,
  },
  lineDanger: {
    color: colors.danger,
  },
  lineOk: {
    color: colors.success,
  },
  permissionGroup: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: 5,
    paddingTop: 10,
  },
  permissionTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
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
