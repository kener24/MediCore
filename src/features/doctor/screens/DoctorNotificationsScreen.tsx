import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { DoctorHeader } from '@/features/doctor/components/DoctorHeader';
import {
  getDoctorNotifications,
  getDoctorUnreadNotificationsCount,
  markDoctorNotificationAsRead,
} from '@/features/doctor/services/doctorNotificationsService';
import { isNotificationRead, NotificationCard } from '@/features/patient/components/NotificationCard';
import type { PatientNotification } from '@/features/patient/types/patientNotifications.types';

export function DoctorNotificationsScreen() {
  const [notifications, setNotifications] = useState<PatientNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const unread = useMemo(() => notifications.filter((item) => !isNotificationRead(item)).length, [notifications]);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [items, count] = await Promise.all([
        getDoctorNotifications(),
        getDoctorUnreadNotificationsCount().catch(() => 0),
      ]);
      setNotifications(items);
      setUnreadCount(count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las notificaciones.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function markRead(notification: PatientNotification) {
    if (isNotificationRead(notification)) return;
    try {
      await markDoctorNotificationAsRead(notification.id);
      setNotifications((current) => current.map((item) => (item.id === notification.id ? { ...item, is_read: true, status: 'read' } : item)));
      setUnreadCount((current) => Math.max(current - 1, 0));
      Alert.alert('Notificaciónes', 'Notificación marcada como leída.');
    } catch (err) {
      Alert.alert('Notificaciónes', err instanceof Error ? err.message : 'No se pudo marcar como leída.');
    }
  }

  if (loading) return <LoadingState label="Cargando notificaciones..." />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => load(true)} refreshing={refreshing} />}
        showsVerticalScrollIndicator={false}>
        <DoctorHeader title="Notificaciónes" unreadCount={unreadCount || unread} />
        {error ? (
          <ErrorState message={error} onRetry={() => load()} title="No se pudieron cargar las notificaciones" />
        ) : notifications.length ? (
          notifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onMarkAsRead={() => markRead(notification)}
              onPress={() => markRead(notification)}
            />
          ))
        ) : (
          <EmptyState title="No tienes notificaciones." />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 22, paddingBottom: 118 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
});
