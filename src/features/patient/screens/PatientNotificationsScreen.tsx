import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { isNotificationRead, NotificationCard } from '@/features/patient/components/NotificationCard';
import { PatientHeader } from '@/features/patient/components/PatientHeader';
import { UnreadBadge } from '@/features/patient/components/UnreadBadge';
import {
  getPatientNotifications,
  getPatientUnreadNotificationsCount,
  markAllPatientNotificationsRead,
  markNotificationAsRead,
} from '@/features/patient/services/patientNotificationsService';
import type { PatientNotification } from '@/features/patient/types/patientNotifications.types';

type Filter = 'all' | 'unread';

export function PatientNotificationsScreen() {
  const [notifications, setNotifications] = useState<PatientNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<Filter>('all');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') return notifications.filter((item) => !isNotificationRead(item));
    return notifications;
  }, [filter, notifications]);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [items, count] = await Promise.all([
        getPatientNotifications(),
        getPatientUnreadNotificationsCount(),
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
      await markNotificationAsRead(notification.id);
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, is_read: true, read: true, status: 'read' } : item,
        ),
      );
      setUnreadCount((current) => Math.max(current - 1, 0));
    } catch (err) {
      Alert.alert('Notificaciones', err instanceof Error ? err.message : 'No se pudo marcar como leida.');
    }
  }

  async function markAllRead() {
    if (unreadCount <= 0) return;
    try {
      await markAllPatientNotificationsRead();
      setNotifications((current) =>
        current.map((item) => ({ ...item, is_read: true, read: true, status: 'read' })),
      );
      setUnreadCount(0);
      Alert.alert('Notificaciones', 'Todas las notificaciones fueron marcadas como leidas.');
    } catch (err) {
      Alert.alert('Notificaciones', err instanceof Error ? err.message : 'No se pudieron marcar las notificaciones.');
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
        <View style={styles.counterCard}>
          <View>
            <Text style={styles.counterLabel}>No leidas</Text>
            <Text style={styles.counterText}>{unreadCount}</Text>
          </View>
          <UnreadBadge count={unreadCount} />
        </View>
        <View style={styles.filters}>
          <FilterButton active={filter === 'all'} label="Todas" onPress={() => setFilter('all')} />
          <FilterButton active={filter === 'unread'} label="No leidas" onPress={() => setFilter('unread')} />
        </View>
        <AppButton
          disabled={unreadCount <= 0}
          label="Marcar todas como leidas"
          onPress={markAllRead}
          variant="secondary"
        />
        {error ? (
          <ErrorState message={error} onRetry={() => load()} title="No se pudieron cargar las notificaciones" />
        ) : filteredNotifications.length ? (
          filteredNotifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onMarkAsRead={() => markRead(notification)}
              onPress={() => markRead(notification)}
            />
          ))
        ) : (
          <EmptyState
            description={filter === 'unread' ? 'No tienes notificaciones pendientes.' : 'No tienes notificaciones.'}
            title={filter === 'unread' ? 'Todo al dia' : 'Sin notificaciones'}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function FilterButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.filterButton, active && styles.filterButtonActive]}>
      <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, padding: 22, paddingBottom: 34 },
  counterCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  counterLabel: { color: colors.muted, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  counterText: { color: colors.ink, fontSize: 26, fontWeight: '900' },
  filterButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 11,
  },
  filterButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.muted, fontSize: 13, fontWeight: '900' },
  filterTextActive: { color: colors.white },
  filters: { flexDirection: 'row', gap: 10 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
});
