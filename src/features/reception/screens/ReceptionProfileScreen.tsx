import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { useAuth } from '@/features/auth/context/AuthContext';
import { getReceptionProfile } from '@/features/reception/services/receptionProfileService';
import type { ReceptionProfile } from '@/features/reception/types/receptionProfile.types';

export function ReceptionProfileScreen() {
  const navigation = useNavigation<any>();
  const { role, signOut, user } = useAuth();
  const [profile, setProfile] = useState<ReceptionProfile | null>(user);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setProfile(await getReceptionProfile());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el perfil.');
      if (user) setProfile(user);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function logout() {
    Alert.alert('Cerrar sesión', '¿Deseas cerrar la sesión?', [
      { style: 'cancel', text: 'Cancelar' },
      { style: 'destructive', text: 'Cerrar sesión', onPress: () => void signOut() },
    ]);
  }

  if (loading) return <LoadingState label="Cargando perfil..." />;
  const activeProfile = profile ?? user;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
        <AppHeader icon="account-cog-outline" subtitle="Perfil operativo de recepción." title="Perfil" />
        {error ? <ErrorState message={error} onRetry={() => void load()} title="Perfil parcial" /> : null}
        <AppCard style={styles.card}>
          <Text style={styles.title}>{activeProfile?.nombre_completo ?? 'Recepción'}</Text>
          <Info label="Correo" value={activeProfile?.email ?? 'No registrado'} />
          <Info label="Rol" value={String(role ?? activeProfile?.role_nombre ?? 'recepcionista')} />
          <Info label="Clínica" value={activeProfile?.clinica_nombre ?? (typeof activeProfile?.clinica === 'object' ? activeProfile.clinica?.nombre ?? 'No asignada' : 'No asignada')} />
          <Info label="Teléfono" value={activeProfile?.telefono ?? 'No registrado'} />
          <Info label="Estado" value={activeProfile?.is_active ? 'Activo' : 'Inactivo'} />
        </AppCard>
        <AppButton label="Editar perfil" onPress={() => navigation.navigate('ReceptionEditProfile', { profile: activeProfile })} />
        <AppButton label="Seguridad y configuración" onPress={() => navigation.navigate('ReceptionSecurity')} variant="secondary" />
        <AppButton label="Cambiar contraseña" onPress={() => navigation.navigate('ReceptionChangePassword')} variant="secondary" />
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
