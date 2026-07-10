import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { RoleGuard } from '@/components/RoleGuard';
import { StatCard } from '@/components/StatCard';
import { colors } from '@/core/theme/colors';
import {
  getAdminAuditLogs,
  getAdminClinicReport,
  getAdminFinancialReport,
  getAdminSubscription,
  getAdminUsage,
} from '@/features/admin/services/adminService';
import type { AdminAuditLog, AdminReportSummary, AdminSubscription, AdminUsage } from '@/features/admin/types/admin.types';
import { formatCurrency, formatDateTime } from '@/features/cashier/types/commonCashier.types';

export function AdminReportsScreen() {
  const [clinicReport, setClinicReport] = useState<AdminReportSummary | null>(null);
  const [financialReport, setFinancialReport] = useState<AdminReportSummary | null>(null);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [subscription, setSubscription] = useState<AdminSubscription | null>(null);
  const [usage, setUsage] = useState<AdminUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [clinic, financial, audit, sub, planUsage] = await Promise.all([
        getAdminClinicReport().catch(() => null),
        getAdminFinancialReport().catch(() => null),
        getAdminAuditLogs().catch(() => []),
        getAdminSubscription(),
        getAdminUsage(),
      ]);
      setClinicReport(clinic);
      setFinancialReport(financial);
      setAuditLogs(audit);
      setSubscription(sub);
      setUsage(planUsage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar reportes administrativos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading) return <LoadingState label="Cargando reportes..." />;

  return (
    <RoleGuard roles={['admin']}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
          <AppHeader icon="chart-box-outline" subtitle="Finanzas, auditoría y uso del sistema." title="Reportes y control" />
          {error ? <ErrorState message={error} onRetry={() => void load()} title="Reportes no disponibles" /> : null}

          <View style={styles.stats}>
            <StatCard icon="account-group-outline" label="Pacientes" value={String(clinicReport?.patients ?? usage?.patients ?? 0)} />
            <StatCard icon="calendar-today-outline" label="Citas" tone="blue" value={String(clinicReport?.appointments ?? usage?.appointments ?? 0)} />
            <StatCard icon="cash-register" label="Ingresos" tone="warning" value={formatCurrency(financialReport?.revenue ?? financialReport?.payments ?? 0)} />
          </View>

          <AppCard style={styles.card}>
            <Text style={styles.title}>Suscripción</Text>
            <Text style={styles.meta}>Plan: {subscription?.plan_name ?? 'No disponible'}</Text>
            <Text style={styles.meta}>Estado: {subscription?.status ?? 'No disponible'}</Text>
            <Text style={styles.meta}>Vence: {subscription?.current_period_end ?? subscription?.ends_at ?? 'No disponible'}</Text>
          </AppCard>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Última actividad auditada</Text>
            {auditLogs.length === 0 ? <EmptyState description="No se encontraron eventos recientes." title="Sin auditoría reciente" /> : null}
            {auditLogs.map((log) => (
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
    gap: 5,
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

