import { useFocusEffect, useNavigation } from '@react-navigation/native';
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
import { colors } from '@/core/theme/colors';
import { formatDateTime } from '@/features/cashier/types/commonCashier.types';
import { StatusPill } from '@/features/superadmin/components/SuperAdminCards';
import { getSuperAdminClinicAdmins, setUserActive, userName } from '@/features/superadmin/services/superAdminService';
import type { SuperAdminUser } from '@/features/superadmin/types/superAdmin.types';

const statusFilters = ['Todos', 'Activos', 'Inactivos'] as const;
type StatusFilter = (typeof statusFilters)[number];

export function SuperAdminUsersScreen() {
  const navigation = useNavigation<any>();
  const [admins, setAdmins] = useState<SuperAdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Todos');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setAdmins(await getSuperAdminClinicAdmins());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los administradores de clínica.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return admins.filter((admin) => {
      const active = admin.is_active !== false;
      const matchesStatus = statusFilter === 'Todos' || (statusFilter === 'Activos' ? active : !active);
      const matchesTerm = !term || [userName(admin), admin.email, admin.telefono, admin.clinica_nombre].join(' ').toLowerCase().includes(term);
      return matchesStatus && matchesTerm;
    });
  }, [admins, search, statusFilter]);

  const activeCount = admins.filter((admin) => admin.is_active !== false).length;
  const inactiveCount = admins.length - activeCount;

  const confirmStatus = (admin: SuperAdminUser, active: boolean) => {
    const activeAdminsForClinic = admins.filter((item) => item.clinica === admin.clinica && item.is_active !== false).length;
    if (!active && activeAdminsForClinic <= 1) {
      Alert.alert('Acción bloqueada', 'No puedes dejar una clínica sin administrador activo.');
      return;
    }
    Alert.alert(active ? 'Activar admin' : 'Desactivar admin', `${userName(admin)} cambiará de estado.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: () => void changeStatus(admin, active),
        style: active ? 'default' : 'destructive',
      },
    ]);
  };

  async function changeStatus(admin: SuperAdminUser, active: boolean) {
    try {
      await setUserActive(admin.id, active, active ? 'Reactivación autorizada por superadmin.' : 'Desactivación autorizada por superadmin.');
      await load(true);
    } catch (err) {
      Alert.alert('Administradores', err instanceof Error ? err.message : 'No se pudo cambiar el estado.');
    }
  }

  if (loading) return <LoadingState label="Cargando administradores..." />;

  return (
    <RoleGuard roles={['superadmin']}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
          <AppHeader icon="account-supervisor-outline" subtitle="Solo administradores asignados a clínicas." title="Admins de clínica" />
          {error ? <ErrorState message={error} onRetry={() => void load()} title="Administradores no disponibles" /> : null}
          <AppButton label="Crear admin de clínica" onPress={() => navigation.navigate('SuperAdminCreateAdmin')} />
          <AppInput icon="magnify" label="Buscar admin" onChangeText={setSearch} placeholder="Nombre, correo, teléfono o clínica" value={search} />

          <View style={styles.summary}>
            <Text style={styles.summaryText}>Total: {admins.length}</Text>
            <Text style={styles.summaryText}>Activos: {activeCount}</Text>
            <Text style={styles.summaryText}>Inactivos: {inactiveCount}</Text>
          </View>

          <View style={styles.filters}>
            {statusFilters.map((item) => (
              <Text key={item} onPress={() => setStatusFilter(item)} style={[styles.filter, statusFilter === item && styles.filterActive, statusFilter === item && styles.filterTextActive]}>
                {item}
              </Text>
            ))}
          </View>

          <Text style={styles.counter}>{filtered.length} de {admins.length} administradores</Text>
          {!error && filtered.length === 0 ? <EmptyState description="No hay administradores de clínica con esos criterios." title="Sin resultados" /> : null}
          {filtered.map((admin) => (
            <AppCard key={admin.id} style={styles.card}>
              <View style={styles.row}>
                <View style={styles.main}>
                  <Text style={styles.title}>{userName(admin)}</Text>
                  <Text style={styles.meta}>{admin.email}</Text>
                  <Text style={styles.meta}>{admin.clinica_nombre || 'Sin clínica'} · {admin.telefono || 'Sin teléfono'}</Text>
                  <Text style={styles.meta}>Último acceso: {formatDateTime(admin.ultimo_acceso)}</Text>
                </View>
                <StatusPill active={admin.is_active !== false} />
              </View>
              <AppButton label="Editar admin" onPress={() => navigation.navigate('SuperAdminEditAdmin', { userId: admin.id })} />
              <AppButton label={admin.is_active === false ? 'Activar' : 'Desactivar'} onPress={() => confirmStatus(admin, admin.is_active === false)} variant={admin.is_active === false ? 'secondary' : 'danger'} />
            </AppCard>
          ))}
        </ScrollView>
      </SafeAreaView>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  content: { gap: 14, padding: 18, paddingBottom: 120 },
  counter: { color: colors.muted, fontSize: 13, fontWeight: '800' },
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
  filterActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterTextActive: { color: colors.white },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  main: { flex: 1, gap: 3 },
  meta: { color: colors.muted, fontSize: 13, fontWeight: '700', lineHeight: 18 },
  row: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  safe: { backgroundColor: colors.background, flex: 1 },
  summary: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  summaryText: {
    backgroundColor: colors.palePrimary,
    borderRadius: 999,
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  title: { color: colors.ink, fontSize: 16, fontWeight: '900' },
});
