import { useFocusEffect } from '@react-navigation/native';
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
import { StatusPill } from '@/features/superadmin/components/SuperAdminCards';
import { getSuperAdminUsers, setUserActive, userName, userRole } from '@/features/superadmin/services/superAdminService';
import type { SuperAdminUser } from '@/features/superadmin/types/superAdmin.types';

export function SuperAdminUsersScreen() {
  const [users, setUsers] = useState<SuperAdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setUsers(await getSuperAdminUsers());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los usuarios.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) => [userName(user), user.email, userRole(user), user.clinica_nombre].join(' ').toLowerCase().includes(term));
  }, [search, users]);

  const confirmStatus = (user: SuperAdminUser, active: boolean) => {
    Alert.alert(active ? 'Activar usuario' : 'Desactivar usuario', `${userName(user)} cambiará de estado. ¿Deseas continuar?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: () => void changeStatus(user, active), style: active ? 'default' : 'destructive' },
    ]);
  };

  async function changeStatus(user: SuperAdminUser, active: boolean) {
    try {
      await setUserActive(user.id, active);
      await load(true);
    } catch (err) {
      Alert.alert('Usuarios', err instanceof Error ? err.message : 'No se pudo cambiar el estado.');
    }
  }

  if (loading) return <LoadingState label="Cargando usuarios globales..." />;

  return (
    <RoleGuard roles={['superadmin']}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
          <AppHeader icon="account-supervisor-outline" subtitle="Usuarios de todas las clínicas y roles." title="Usuarios globales" />
          {error ? <ErrorState message={error} onRetry={() => void load()} title="Usuarios no disponibles" /> : null}
          <AppInput icon="magnify" label="Buscar usuario" onChangeText={setSearch} placeholder="Nombre, correo, rol o clínica" value={search} />
          <Text style={styles.counter}>{filtered.length} de {users.length} usuarios</Text>
          {!error && filtered.length === 0 ? <EmptyState description="No hay usuarios con esos criterios." title="Sin resultados" /> : null}
          {filtered.map((user) => (
            <AppCard key={user.id} style={styles.card}>
              <View style={styles.row}>
                <View style={styles.main}>
                  <Text style={styles.title}>{userName(user)}</Text>
                  <Text style={styles.meta}>{user.email}</Text>
                  <Text style={styles.meta}>{userRole(user)} · {user.clinica_nombre || 'Sin clínica'}</Text>
                </View>
                <StatusPill active={user.is_active !== false} />
              </View>
              <AppButton label={user.is_active === false ? 'Activar' : 'Desactivar'} onPress={() => confirmStatus(user, user.is_active === false)} variant={user.is_active === false ? 'secondary' : 'danger'} />
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
  main: { flex: 1, gap: 3 },
  meta: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  row: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  safe: { backgroundColor: colors.background, flex: 1 },
  title: { color: colors.ink, fontSize: 16, fontWeight: '900' },
});

