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
import { getSuperAdminClinicAdmins, getSuperAdminDashboard } from '@/features/superadmin/services/superAdminService';
import type { SuperAdminDashboard, SuperAdminUser } from '@/features/superadmin/types/superAdmin.types';

export function SuperAdminHomeScreen() {
  const navigation = useNavigation<any>();
  const [data, setData] = useState<SuperAdminDashboard | null>(null);
  const [admins, setAdmins] = useState<SuperAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [dashboard, clinicAdmins] = await Promise.all([
        getSuperAdminDashboard(),
        getSuperAdminClinicAdmins().catch(() => []),
      ]);
      setData(dashboard);
      setAdmins(clinicAdmins);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el control global.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading) return <LoadingState label="Cargando control global..." />;

  const activeAdmins = admins.filter((admin) => admin.is_active !== false).length;
  const inactiveAdmins = admins.length - activeAdmins;

  return (
    <RoleGuard roles={['superadmin']}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
          <AppHeader icon="shield-crown-outline" subtitle="Gestión central de clínicas y sus administradores." title="Super Admin" />
          {error ? <ErrorState message={error} onRetry={() => void load()} title="Control no disponible" /> : null}

          <View style={styles.stats}>
            <StatCard icon="domain" label="Clínicas" value={String(data?.total_clinics ?? 0)} />
            <StatCard icon="check-decagram-outline" label="Activas" tone="blue" value={String(data?.active_clinics ?? 0)} />
            <StatCard icon="domain-off" label="Inactivas" tone="warning" value={String(data?.inactive_clinics ?? 0)} />
            <StatCard icon="account-star-outline" label="Admins" value={String(admins.length || data?.total_admins || 0)} />
          </View>

          <WarningBox text={`Alcance de esta app: administrar clínicas y administradores de clínica. No se muestran datos clínicos, pacientes, caja ni expedientes.`} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gestión principal</Text>
            <ControlCard description="Crear, revisar, editar, activar o desactivar clínicas del SaaS." icon="hospital-building" onPress={() => navigation.navigate('SuperAdminClinicsTab')} title="Clínicas" />
            <ControlCard description={`Administradores activos: ${activeAdmins}. Inactivos: ${inactiveAdmins}.`} icon="account-supervisor-outline" onPress={() => navigation.navigate('SuperAdminUsersTab')} title="Admins de clínica" />
          </View>
        </ScrollView>
      </SafeAreaView>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16, padding: 18, paddingBottom: 120 },
  safe: { backgroundColor: colors.background, flex: 1 },
  section: { gap: 12 },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: '900' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
