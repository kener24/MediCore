import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { StatusBadge } from '@/components/StatusBadge';
import { colors } from '@/core/theme/colors';
import { formatDateTime } from '@/core/utils/dateUtils';
import { useAuth } from '@/features/auth/context/AuthContext';
import { getOwnSessions, revokeOtherOwnSessions, revokeOwnSession, type ManagedSession } from '@/features/security/services/sessionService';

export function PatientActiveSessionsScreen() {
  const navigation = useNavigation();
  const { signOut } = useAuth();
  const [sessions, setSessions] = useState<ManagedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try { setSessions(await getOwnSessions()); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudieron cargar tus sesiones.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  function confirmClose(session: ManagedSession) {
    Alert.alert(
      session.current ? 'Cerrar esta sesión' : 'Cerrar sesión',
      session.current ? 'Volverás a la pantalla de inicio de sesión.' : 'Ese dispositivo perderá el acceso a MediCore.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar', style: 'destructive', onPress: () => void revokeOwnSession(session.id).then(async () => { if (session.current) await signOut(); else await load(); }).catch((err) => Alert.alert('Sesiones', err instanceof Error ? err.message : 'No se pudo cerrar la sesión.')) },
      ],
    );
  }

  async function closeOthers() {
    try { await revokeOtherOwnSessions(); await load(); Alert.alert('Sesiones', 'Las demás sesiones fueron cerradas.'); }
    catch (err) { Alert.alert('Sesiones', err instanceof Error ? err.message : 'No se pudieron cerrar las sesiones.'); }
  }

  if (loading) return <LoadingState label="Cargando sesiones..." />;
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}>
        <AppButton label="Volver" onPress={() => navigation.goBack()} variant="secondary" />
        <Text style={styles.title}>Sesiones activas</Text>
        <Text style={styles.subtitle}>Revisa los dispositivos con acceso y cierra cualquiera que no reconozcas.</Text>
        <AppButton label="Cerrar las demás sesiones" onPress={closeOthers} variant="secondary" />
        {error ? <ErrorState message={error} onRetry={() => void load()} /> : sessions.length ? sessions.map((session) => (
          <AppCard key={session.id} style={styles.card}>
            <StatusBadge label={session.current ? 'Sesión actual' : 'Activa'} status="completed" />
            <Text style={styles.device}>{session.device_name || 'Dispositivo'}</Text>
            <Text style={styles.meta}>{session.platform || 'Plataforma desconocida'} · {session.location_hint || 'Ubicación no disponible'}</Text>
            <Text style={styles.meta}>Última actividad: {formatDateTime(session.last_activity_at)}</Text>
            <AppButton label={session.current ? 'Cerrar esta sesión' : 'Cerrar sesión'} onPress={() => confirmClose(session)} variant="danger" />
          </AppCard>
        )) : <EmptyState title="Sin otras sesiones" description="No hay sesiones activas para mostrar." />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  content: { gap: 14, padding: 22, paddingBottom: 36 },
  device: { color: colors.ink, fontSize: 17, fontWeight: '900' },
  meta: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  title: { color: colors.ink, fontSize: 26, fontWeight: '900' },
});
