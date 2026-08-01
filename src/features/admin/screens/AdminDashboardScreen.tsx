import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { RoleGuard } from '@/components/RoleGuard';
import { StatCard } from '@/components/StatCard';
import { colors } from '@/core/theme/colors';
import { getAdminDashboard } from '@/features/admin/services/adminService';
import type { AdminDashboard } from '@/features/admin/types/admin.types';
import { formatCurrency } from '@/features/cashier/types/commonCashier.types';

const periods = [{ key: 'today', label: 'Hoy' }, { key: '7d', label: '7 días' }, { key: 'month', label: 'Este mes' }] as const;

export function AdminDashboardScreen() {
  const navigation = useNavigation<any>();
  const [period, setPeriod] = useState<(typeof periods)[number]['key']>('today');
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try { setDashboard(await getAdminDashboard({ period })); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo cargar el resumen administrativo.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [period]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (loading) return <LoadingState label="Cargando resumen..." />;

  const operation = dashboard?.operation;
  const finance = dashboard?.finance;
  const inventory = dashboard?.inventory;
  const users = dashboard?.users;
  const status = dashboard?.operation_status;
  const alerts = dashboard?.alerts ?? [];

  return (
    <RoleGuard roles={['admin']}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
          <AppHeader icon="view-dashboard-outline" subtitle="Indicadores agregados y privados de tu clínica." title="Dashboard ejecutivo" />
          <View style={styles.filters}>{periods.map((item) => <Pressable key={item.key} onPress={() => setPeriod(item.key)} style={[styles.chip, period === item.key && styles.chipActive]}><Text style={[styles.chipText, period === item.key && styles.chipTextActive]}>{item.label}</Text></Pressable>)}</View>
          {error ? <ErrorState message={error} onRetry={() => void load()} title="Resumen no disponible" /> : null}

          <Text style={styles.sectionTitle}>Operación</Text>
          <View style={styles.stats}>
            <StatCard icon="calendar-today-outline" label="Programadas" value={String(operation?.appointments_scheduled ?? 0)} />
            <StatCard icon="check-circle-outline" label="Atendidas" tone="blue" value={String(operation?.appointments_attended ?? 0)} />
            <StatCard icon="account-clock-outline" label="En espera" tone="warning" value={String(operation?.patients_waiting ?? 0)} />
            <StatCard icon="stethoscope" label="En consulta" value={String(operation?.patients_in_consultation ?? 0)} />
            <StatCard icon="hospital-building" label="Hospitalizados" tone="blue" value={String(operation?.patients_hospitalized ?? 0)} />
            <StatCard icon="calendar-remove-outline" label="No asistieron" tone="warning" value={String(operation?.appointments_no_show ?? 0)} />
          </View>

          <Text style={styles.sectionTitle}>Finanzas</Text>
          <View style={styles.stats}>
            <StatCard icon="file-document-outline" label="Facturado" value={formatCurrency(finance?.invoiced ?? 0)} />
            <StatCard icon="cash-check" label="Pagado" tone="blue" value={formatCurrency(finance?.paid ?? 0)} />
            <StatCard icon="cash-clock" label="Saldo" tone="warning" value={formatCurrency(finance?.balance_due ?? 0)} />
            <StatCard icon="cash-register" label="Cajas abiertas" value={String(finance?.open_cash_sessions ?? 0)} />
          </View>

          <Text style={styles.sectionTitle}>Inventario y accesos</Text>
          <View style={styles.stats}>
            <StatCard icon="package-variant-closed-remove" label="Agotados" tone="warning" value={String(inventory?.out_of_stock ?? 0)} />
            <StatCard icon="package-variant" label="Bajo mínimo" value={String(inventory?.low_stock ?? 0)} />
            <StatCard icon="account-group-outline" label="Usuarios activos" tone="blue" value={String(users?.active ?? 0)} />
            <StatCard icon="cellphone-key" label="Sesiones" value={String(users?.active_sessions ?? 0)} />
          </View>

          <AppCard style={styles.card}>
            <View style={styles.row}><Text style={styles.sectionTitle}>Estado operativo</Text><Text style={[styles.status, status?.clinic_active ? styles.ok : styles.bad]}>{status?.clinic_active ? 'Operativa' : 'Requiere atención'}</Text></View>
            <Status label="Portal de pacientes" value={status?.patient_portal_active} />
            <Status label="Citas en línea" value={status?.online_appointments_active} />
            <Status label="Atención presencial" value={status?.in_person_appointments_active} />
            <Status label="Rango fiscal vigente" value={status?.valid_fiscal_range} />
          </AppCard>

          <AppCard style={styles.card}>
            <View style={styles.row}><Text style={styles.sectionTitle}>Alertas operativas</Text><Text style={styles.alertCount}>{alerts.length}</Text></View>
            {alerts.slice(0, 3).map((alert) => <View key={alert.key} style={styles.alert}><Text style={styles.alertTitle}>{alert.title}</Text><Text style={styles.meta}>{alert.count} · {alert.detail}</Text></View>)}
            {!alerts.length ? <Text style={styles.meta}>No hay alertas operativas pendientes.</Text> : null}
            <AppButton label="Ver todas las alertas" onPress={() => navigation.navigate('AdminAlerts')} variant="secondary" />
          </AppCard>
        </ScrollView>
      </SafeAreaView>
    </RoleGuard>
  );
}

function Status({ label, value }: { label: string; value?: boolean }) { return <View style={styles.statusRow}><Text style={styles.meta}>{label}</Text><Text style={[styles.statusText, value ? styles.okText : styles.badText]}>{value ? 'Activo' : 'Inactivo'}</Text></View>; }
const styles = StyleSheet.create({
  alert: { borderTopColor: colors.border, borderTopWidth: 1, gap: 3, paddingTop: 9 },
  alertCount: { backgroundColor: '#fee2e2', borderRadius: 999, color: colors.danger, fontSize: 12, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5 },
  alertTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  bad: { backgroundColor: '#fee2e2', color: colors.danger },
  badText: { color: colors.danger },
  card: { gap: 10 },
  chip: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 9 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  chipTextActive: { color: colors.white },
  content: { gap: 16, padding: 18, paddingBottom: 120 },
  filters: { flexDirection: 'row', gap: 8 },
  meta: { color: colors.muted, flex: 1, fontSize: 13, fontWeight: '700', lineHeight: 19 },
  ok: { backgroundColor: '#dcfce7', color: colors.success },
  okText: { color: colors.success },
  row: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  safe: { backgroundColor: colors.background, flex: 1 },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  status: { borderRadius: 999, fontSize: 11, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 6 },
  statusRow: { alignItems: 'center', borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', paddingTop: 9 },
  statusText: { fontSize: 12, fontWeight: '900' },
});
