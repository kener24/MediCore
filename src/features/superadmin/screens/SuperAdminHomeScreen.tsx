import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { RoleGuard } from '@/components/RoleGuard';
import { StatCard } from '@/components/StatCard';
import { colors } from '@/core/theme/colors';
import { ControlCard, WarningBox } from '@/features/superadmin/components/SuperAdminCards';
import { getSuperAdminDashboard } from '@/features/superadmin/services/superAdminService';
import type { SuperAdminDashboard } from '@/features/superadmin/types/superAdmin.types';

export function SuperAdminHomeScreen() {
  const navigation = useNavigation<any>();
  const [data, setData] = useState<SuperAdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setData(await getSuperAdminDashboard());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el control global.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading) return <LoadingState label="Cargando control global..." />;

  return (
    <RoleGuard roles={['superadmin']}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
          <AppHeader icon="shield-crown-outline" subtitle="Control central SaaS de MediCore." title="Super Admin" />
          {error ? <ErrorState message={error} onRetry={() => void load()} title="Control no disponible" /> : null}
          <View style={styles.stats}>
            <StatCard icon="domain" label="Clínicas" value={String(data?.total_clinics ?? 0)} />
            <StatCard icon="check-decagram-outline" label="Activas" tone="blue" value={String(data?.active_clinics ?? 0)} />
            <StatCard icon="account-group-outline" label="Usuarios" tone="warning" value={String(data?.total_users ?? 0)} />
          </View>
          <WarningBox text="Las acciones de superadmin afectan todo el SaaS. Revisa dos veces antes de activar, desactivar o crear recursos globales." />
          <Text style={styles.sectionTitle}>Centro de control</Text>
          <ControlCard description="Crear, revisar, activar o desactivar clínicas del sistema." icon="hospital-building" onPress={() => navigation.navigate('SuperAdminClinicsTab')} title="Clínicas" />
          <ControlCard description="Auditar usuarios, roles, actividad y estado de acceso." icon="account-supervisor-outline" onPress={() => navigation.navigate('SuperAdminUsersTab')} title="Usuarios globales" />
          <ControlCard description="Ver auditoría reciente, suscripciones y señales de operación." icon="chart-timeline-variant" onPress={() => navigation.navigate('SuperAdminControlTab')} title="Control y auditoría" />
        </ScrollView>
      </SafeAreaView>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16, padding: 18, paddingBottom: 120 },
  safe: { backgroundColor: colors.background, flex: 1 },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: '900' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});

