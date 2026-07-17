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
import { adminUserName, adminUserRole, getAdminUsers, setAdminUserActive } from '@/features/admin/services/adminService';
import type { AdminUser } from '@/features/admin/types/admin.types';

const roleFilters = [
  { label: 'Todos', value: 'all' },
  { label: 'Doctores', value: 'medico' },
  { label: 'Enfermería', value: 'enfermera' },
  { label: 'Recepción', value: 'recepcionista' },
] as const;

const statusFilters = [
  { label: 'Todos', value: 'all' },
  { label: 'Activos', value: 'active' },
  { label: 'Inactivos', value: 'inactive' },
] as const;

type RoleFilter = (typeof roleFilters)[number]['value'];
type StatusFilter = (typeof statusFilters)[number]['value'];

export function AdminUsersScreen() {
  const navigation = useNavigation<any>();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [changingId, setChangingId] = useState<number | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setUsers(await getAdminUsers());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el equipo de la clínica.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const stats = useMemo(() => ({
    active: users.filter((user) => user.is_active !== false).length,
    doctors: users.filter((user) => String(adminUserRole(user)).toLowerCase().includes('medico')).length,
    inactive: users.filter((user) => user.is_active === false).length,
    nurses: users.filter((user) => String(adminUserRole(user)).toLowerCase().includes('enfermera')).length,
    reception: users.filter((user) => String(adminUserRole(user)).toLowerCase().includes('recepcionista')).length,
  }), [users]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users
      .filter((user) => {
        const role = String(adminUserRole(user)).toLowerCase();
        const active = user.is_active !== false;
        const matchesRole = roleFilter === 'all' || role.includes(roleFilter);
        const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? active : !active);
        const matchesSearch = !term || [adminUserName(user), user.email, adminUserRole(user), user.telefono, user.phone].join(' ').toLowerCase().includes(term);
        return matchesRole && matchesStatus && matchesSearch;
      })
      .sort((a, b) => Number(b.is_active !== false) - Number(a.is_active !== false) || adminUserName(a).localeCompare(adminUserName(b)));
  }, [roleFilter, search, statusFilter, users]);

  const confirmStatus = (user: AdminUser, active: boolean) => {
    Alert.alert(active ? 'Activar usuario' : 'Desactivar usuario', `${adminUserName(user)} cambiará de estado. ¿Deseas continuar?`, [
      { style: 'cancel', text: 'Cancelar' },
      { onPress: () => void changeStatus(user, active), style: active ? 'default' : 'destructive', text: 'Confirmar' },
    ]);
  };

  async function changeStatus(user: AdminUser, active: boolean) {
    if (changingId) return;
    setChangingId(user.id);
    try {
      await setAdminUserActive(user.id, active);
      await load(true);
    } catch (err) {
      Alert.alert('Equipo', err instanceof Error ? err.message : 'No se pudo cambiar el estado del usuario.');
    } finally {
      setChangingId(null);
    }
  }

  if (loading) return <LoadingState label="Cargando usuarios..." />;

  return (
    <RoleGuard roles={['admin']}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
          <AppHeader icon="account-cog-outline" subtitle="Consulta accesos, roles y estado del equipo." title="Equipo y permisos" />
          {error ? <ErrorState message={error} onRetry={() => void load()} title="Usuarios no disponibles" /> : null}
          <AppButton label="Crear enfermero, recepción o doctor" onPress={() => navigation.navigate('AdminCreateStaff')} />
          <AppInput icon="magnify" label="Buscar usuario" onChangeText={setSearch} placeholder="Nombre, correo o rol" value={search} />

          <View style={styles.summary}>
            <Text style={styles.summaryText}>Activos: {stats.active}</Text>
            <Text style={styles.summaryText}>Inactivos: {stats.inactive}</Text>
            <Text style={styles.summaryText}>Doctores: {stats.doctors}</Text>
            <Text style={styles.summaryText}>Enfermería: {stats.nurses}</Text>
            <Text style={styles.summaryText}>Recepción: {stats.reception}</Text>
          </View>

          <View style={styles.filterGroup}>
            <Text style={styles.filterTitle}>Rol</Text>
            <View style={styles.filterRow}>
              {roleFilters.map((filter) => (
                <Text key={filter.value} onPress={() => setRoleFilter(filter.value)} style={[styles.filterChip, roleFilter === filter.value && styles.filterChipActive, roleFilter === filter.value && styles.filterChipTextActive]}>
                  {filter.label}
                </Text>
              ))}
            </View>
          </View>

          <View style={styles.filterGroup}>
            <Text style={styles.filterTitle}>Estado</Text>
            <View style={styles.filterRow}>
              {statusFilters.map((filter) => (
                <Text key={filter.value} onPress={() => setStatusFilter(filter.value)} style={[styles.filterChip, statusFilter === filter.value && styles.filterChipActive, statusFilter === filter.value && styles.filterChipTextActive]}>
                  {filter.label}
                </Text>
              ))}
            </View>
          </View>

          <Text style={styles.counter}>{filtered.length} de {users.length} usuarios</Text>
          {!error && filtered.length === 0 ? (
            <EmptyState
              actionLabel={users.length === 0 ? 'Crear usuario' : undefined}
              description={users.length === 0 ? 'Crea médicos, enfermería o recepción para empezar a operar la clínica desde MediCore.' : 'No hay usuarios que coincidan con los filtros actuales.'}
              icon={users.length === 0 ? 'account-multiple-plus-outline' : 'account-search-outline'}
              onAction={users.length === 0 ? () => navigation.navigate('AdminCreateStaff') : undefined}
              title={users.length === 0 ? 'Aún no hay equipo configurado' : 'Sin resultados'}
              tone={users.length === 0 ? 'info' : 'warning'}
            />
          ) : null}

          {filtered.map((user) => (
            <AppCard key={user.id} style={styles.userCard}>
              <View style={styles.userHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{adminUserName(user).slice(0, 1).toUpperCase()}</Text>
                </View>
                <View style={styles.userText}>
                  <Text style={styles.name}>{adminUserName(user)}</Text>
                  <Text style={styles.email}>{user.email}</Text>
                </View>
                <View style={[styles.status, user.is_active === false && styles.statusOff]}>
                  <Text style={[styles.statusText, user.is_active === false && styles.statusTextOff]}>{user.is_active === false ? 'Inactivo' : 'Activo'}</Text>
                </View>
              </View>
              <Text style={styles.meta}>Rol: {adminUserRole(user)}</Text>
              <Text style={styles.meta}>Teléfono: {user.telefono ?? user.phone ?? 'Sin teléfono'}</Text>
              <AppButton
                disabled={changingId === user.id}
                label={user.is_active === false ? 'Activar usuario' : 'Desactivar usuario'}
                loading={changingId === user.id}
                onPress={() => confirmStatus(user, user.is_active === false)}
                variant={user.is_active === false ? 'secondary' : 'danger'}
              />
            </AppCard>
          ))}
        </ScrollView>
      </SafeAreaView>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.palePrimary,
    borderRadius: 16,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  avatarText: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: '900',
  },
  content: {
    gap: 14,
    padding: 18,
    paddingBottom: 120,
  },
  counter: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  email: {
    color: colors.muted,
    fontSize: 13,
  },
  filterChip: {
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
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipTextActive: {
    color: colors.white,
  },
  filterGroup: {
    gap: 8,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  name: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  safe: {
    backgroundColor: colors.background,
    flex: 1,
  },
  status: {
    backgroundColor: colors.palePrimary,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusOff: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '900',
  },
  statusTextOff: {
    color: colors.danger,
  },
  summary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
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
  userCard: {
    gap: 10,
  },
  userHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  userText: {
    flex: 1,
  },
});
