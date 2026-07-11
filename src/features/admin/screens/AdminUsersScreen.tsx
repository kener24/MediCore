import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppCard } from '@/components/AppCard';
import { AppButton } from '@/components/AppButton';
import { AppHeader } from '@/components/AppHeader';
import { AppInput } from '@/components/AppInput';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { RoleGuard } from '@/components/RoleGuard';
import { colors } from '@/core/theme/colors';
import { adminUserName, adminUserRole, getAdminUsers } from '@/features/admin/services/adminService';
import type { AdminUser } from '@/features/admin/types/admin.types';

export function AdminUsersScreen() {
  const navigation = useNavigation<any>();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

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

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) => [adminUserName(user), user.email, adminUserRole(user)].join(' ').toLowerCase().includes(term));
  }, [search, users]);

  if (loading) return <LoadingState label="Cargando usuarios..." />;

  return (
    <RoleGuard roles={['admin']}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
          <AppHeader icon="account-cog-outline" subtitle="Consulta accesos y roles de la clínica." title="Equipo y permisos" />
          {error ? <ErrorState message={error} onRetry={() => void load()} title="Usuarios no disponibles" /> : null}
          <AppButton label="Crear enfermero, recepción o doctor" onPress={() => navigation.navigate('AdminCreateStaff')} />
          <AppInput icon="magnify" label="Buscar usuario" onChangeText={setSearch} placeholder="Nombre, correo o rol" value={search} />
          <Text style={styles.counter}>{filtered.length} de {users.length} usuarios</Text>
          {!error && filtered.length === 0 ? <EmptyState description="No hay usuarios que coincidan con la búsqueda." title="Sin resultados" /> : null}
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
