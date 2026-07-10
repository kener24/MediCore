import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { StatCard } from '@/components/StatCard';
import { RoleGuard } from '@/components/RoleGuard';
import { colors } from '@/core/theme/colors';
import { AdminActionCard } from '@/features/admin/components/AdminCards';
import { clinicName, getAdminDashboard } from '@/features/admin/services/adminService';
import type { AdminDashboard } from '@/features/admin/types/admin.types';

export function AdminHomeScreen() {
  const navigation = useNavigation<any>();
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setDashboard(await getAdminDashboard());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la administración de clínica.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading) return <LoadingState label="Cargando administración..." />;

  return (
    <RoleGuard roles={['admin']}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
          <AppHeader icon="shield-account-outline" subtitle="Control móvil ejecutivo de la clínica." title={clinicName(dashboard?.clinic)} />
          {error ? <ErrorState message={error} onRetry={() => void load()} title="Panel no disponible" /> : null}

          <View style={styles.stats}>
            <StatCard icon="account-group-outline" label="Usuarios" value={String(dashboard?.total_users ?? 0)} />
            <StatCard icon="account-check-outline" label="Activos" tone="blue" value={String(dashboard?.active_users ?? 0)} />
            <StatCard icon="doctor" label="Médicos" tone="warning" value={String(dashboard?.total_medicos ?? 0)} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Operación administrativa</Text>
            <AdminActionCard
              description="Revisa indicadores clínicos, usuarios y alertas de operación."
              icon="view-dashboard-outline"
              onPress={() => navigation.navigate('AdminDashboard')}
              title="Dashboard ejecutivo"
            />
            <AdminActionCard
              description="Consulta el equipo activo, roles y estado de accesos."
              icon="account-cog-outline"
              onPress={() => navigation.navigate('AdminUsers')}
              title="Equipo y permisos"
            />
            <AdminActionCard
              description="Valida facturación fiscal, CAI, rangos y datos generales."
              icon="domain"
              onPress={() => navigation.navigate('AdminClinic')}
              title="Clínica y fiscal"
            />
            <AdminActionCard
              description="Consulta reportes financieros, citas, auditoría y suscripción."
              icon="chart-box-outline"
              onPress={() => navigation.navigate('AdminReports')}
              title="Reportes y control"
            />
            <AdminActionCard
              description="Consulta tu sesión actual y cierra sesión con seguridad."
              icon="account-lock-outline"
              onPress={() => navigation.navigate('AdminProfile')}
              title="Perfil y seguridad"
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 18,
    padding: 18,
    paddingBottom: 120,
  },
  safe: {
    backgroundColor: colors.background,
    flex: 1,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
});
