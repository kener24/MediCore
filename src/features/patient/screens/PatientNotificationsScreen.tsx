import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { NotificationCard } from '@/features/patient/components/NotificationCard';
import { PatientHeader } from '@/features/patient/components/PatientHeader';
import { getPatientNotifications, markPatientNotificationRead } from '@/features/patient/services/patientNotificationsService';
import type { PatientNotification } from '@/features/patient/types/patientNotifications.types';

export function PatientNotificationsScreen() {
  const [notifications, setNotifications] = useState<PatientNotification[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setNotifications(await getPatientNotifications());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function markRead(id: number) {
    try {
      await markPatientNotificationRead(id);
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo marcar como leida.');
    }
  }

  if (loading) return <LoadingState label="Cargando notificaciones..." />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => load(true)} refreshing={refreshing} />}
        showsVerticalScrollIndicator={false}>
        <PatientHeader subtitle="Avisos enviados por tu clinica." title="Notificaciones" />
        {error ? (
          <ErrorState message={error} onRetry={() => load()} title="No se pudieron cargar notificaciones" />
        ) : notifications.length ? (
          notifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onMarkRead={() => markRead(notification.id)}
            />
          ))
        ) : (
          <EmptyState description="No tienes notificaciones por ahora." title="Sin notificaciones" />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, padding: 22, paddingBottom: 34 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
});
