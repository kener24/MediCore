import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { useAuth } from '@/features/auth/context/AuthContext';
import { CashierHeader } from '@/features/cashier/components/CashierHeader';
import { getCashierProfile } from '@/features/cashier/services/cashierProfileService';
import { formatDateTime } from '@/features/cashier/types/commonCashier.types';
import type { CashierProfile } from '@/features/cashier/types/cashierProfile.types';

export function CashierProfileScreen() {
  const navigation = useNavigation<any>();
  const { role, signOut, user } = useAuth();
  const [profile, setProfile] = useState<CashierProfile | null>(user);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setProfile(await getCashierProfile());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el perfil.');
      if (user) setProfile(user);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  function logout() {
    Alert.alert('Cerrar sesión', '¿Deseas cerrar la sesión?', [
      { style: 'cancel', text: 'Cancelar' },
      { style: 'destructive', text: 'Cerrar sesión', onPress: () => void signOut() },
    ]);
  }

  if (loading) return <LoadingState label="Cargando perfil..." />;
  const active = (profile ?? user) as CashierProfile | null;
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
        <CashierHeader subtitle="Perfil operativo de caja." title="Perfil" />
        {error ? <ErrorState message={error} onRetry={() => void load()} title="Perfil parcial" /> : null}
        <AppCard style={styles.card}>
          <Text style={styles.title}>{active?.nombre_completo ?? 'Caja'}</Text>
          <Info label="Correo" value={active?.email ?? 'No registrado'} />
          <Info label="Rol" value={String(role ?? active?.role_nombre ?? 'cajero')} />
          <Info label="Clínica" value={active?.clinica_nombre ?? (typeof active?.clinica === 'object' ? active.clinica?.nombre ?? 'No asignada' : 'No asignada')} />
          <Info label="Teléfono" value={active?.telefono ?? 'No registrado'} />
          <Info label="Estado" value={active?.is_active ? 'Activo' : 'Inactivo'} />
          <Info label="Ultimo inicio" value={formatDateTime(active?.last_login)} />
        </AppCard>
        <AppButton label="Seguridad" onPress={() => navigation.navigate('CashierSecurity')} variant="secondary" />
        <AppButton label="Cambiar contraseña" onPress={() => navigation.navigate('CashierChangePassword')} variant="secondary" />
        <AppButton label="Cerrar sesión" onPress={logout} variant="danger" />
      </ScrollView>
    </SafeAreaView>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <Text style={styles.meta}>{label}: {value}</Text>;
}

const styles = StyleSheet.create({
  card: { gap: 7 },
  content: { gap: 14, padding: 18, paddingBottom: 120 },
  meta: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  safe: { backgroundColor: colors.background, flex: 1 },
  title: { color: colors.ink, fontSize: 20, fontWeight: '900' },
});
