import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppCard } from '@/components/AppCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { useAuth } from '@/features/auth/context/AuthContext';
import { CashierHeader } from '@/features/cashier/components/CashierHeader';
import { CashierQuickActions } from '@/features/cashier/components/CashierQuickActions';
import { CashierStatsGrid } from '@/features/cashier/components/CashierStatsGrid';
import { getCurrentCashSession } from '@/features/cashier/services/cashierCashService';
import { getCashierDashboard, type CashierDashboard } from '@/features/cashier/services/cashierDashboardService';
import type { CashSession } from '@/features/cashier/types/cashierCash.types';
import { formatCurrency } from '@/features/cashier/types/commonCashier.types';

export function CashierDashboardScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<CashierDashboard | null>(null);
  const [cashSession, setCashSession] = useState<CashSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [dashboardData, session] = await Promise.all([getCashierDashboard(), getCurrentCashSession()]);
      setDashboard(dashboardData);
      setCashSession(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar caja.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading) return <LoadingState label="Cargando caja..." />;
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
        <CashierHeader subtitle="Cobros, pagos parciales y arqueo de la clínica." title="Caja" />
        <AppCard style={styles.card}>
          <Text style={styles.title}>Hola, {user?.nombre_completo ?? 'caja'}</Text>
          <Text style={styles.meta}>Clínica: {user?.clinica_nombre ?? (typeof user?.clinica === 'object' ? user.clinica?.nombre ?? 'No asignada' : 'No asignada')}</Text>
          <Text style={[styles.cashState, cashSession ? styles.cashOpen : styles.cashClosed]}>{cashSession ? `Caja abierta · esperado ${formatCurrency(cashSession.expected_amount_live ?? cashSession.expected_amount)}` : 'Sin caja abierta para efectivo'}</Text>
        </AppCard>
        {error ? <ErrorState message={error} onRetry={() => void load()} title="No se pudo cargar" /> : null}
        {!error && dashboard ? (
          <CashierStatsGrid
            stats={[
              { label: 'Pendientes', value: String(dashboard.pending_invoices ?? 0) },
              { label: 'Pagadas hoy', value: String(dashboard.paid_invoices_today ?? 0) },
              { label: 'Pagos hoy', value: String(dashboard.payments_today ?? 0) },
              { label: 'Cobrado hoy', value: formatCurrency(dashboard.total_collected_today) },
            ]}
          />
        ) : null}
        {!error && !dashboard ? <EmptyState description="No hay resumen disponible." title="Sin datos de caja" /> : null}
        <CashierQuickActions
          onCashSession={() => navigation.navigate('CashierCashSession')}
          onHistory={() => navigation.navigate('CashierPaymentsHistory')}
          onPending={() => navigation.navigate('CashierPendingInvoices')}
          onProfile={() => navigation.navigate('CashierProfile')}
          onSearch={() => navigation.navigate('CashierInvoiceSearch')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { gap: 6 },
  cashClosed: { backgroundColor: '#fff1f2', color: colors.danger },
  cashOpen: { backgroundColor: colors.palePrimary, color: colors.primaryDark },
  cashState: { alignSelf: 'flex-start', borderRadius: 999, fontSize: 12, fontWeight: '900', marginTop: 5, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 5 },
  content: { gap: 14, padding: 18, paddingBottom: 120 },
  meta: { color: colors.muted, fontSize: 14 },
  safe: { backgroundColor: colors.background, flex: 1 },
  title: { color: colors.ink, fontSize: 20, fontWeight: '900' },
});
