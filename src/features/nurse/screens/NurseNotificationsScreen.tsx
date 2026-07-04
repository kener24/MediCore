import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { getNurseNotifications, markNurseNotificationRead } from '@/features/nurse/services/nurseApi';
import type { NurseNotification } from '@/features/nurse/types/nurse.types';

export function NurseNotificationsScreen() {
  const [notifications, setNotifications] = useState<NurseNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setNotifications(await getNurseNotifications());
    } catch {
      setError('Notificaciónes no disponibles por el momento.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function markRead(notification: NurseNotification) {
    if (notification.read) return;
    setNotifications((items) => items.map((item) => (item.id === notification.id ? { ...item, read: true } : item)));
    await markNurseNotificationRead(notification.id).catch(() => undefined);
  }

  if (loading) return <LoadingState label="Cargando notificaciones..." />;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => { setRefreshing(true); void load(); }} refreshing={refreshing} />}>
        <AppHeader icon="bell-outline" subtitle="Avisos operativos y clínicos." title="Notificaciónes" />
        {error ? <ErrorState message={error} title="Sin notificaciones" /> : null}
        {!error && notifications.length === 0 ? <EmptyState description="No hay notificaciones para mostrar." title="Bandeja vacía" /> : null}
        {notifications.map((notification) => (
          <Pressable key={`${notification.id}`} onPress={() => markRead(notification)}>
            <AppCard style={[styles.notification, !notification.read && styles.unread]}>
              <View style={styles.row}>
                <Text style={styles.title}>{notification.title}</Text>
                {!notification.read ? <View style={styles.dot} /> : null}
              </View>
              {notification.message ? <Text style={styles.message}>{notification.message}</Text> : null}
              {notification.createdAt ? <Text style={styles.date}>{notification.createdAt}</Text> : null}
            </AppCard>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    padding: 18,
    paddingBottom: 110,
  },
  date: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  dot: {
    backgroundColor: colors.danger,
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  message: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  notification: {
    gap: 4,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  safe: {
    backgroundColor: colors.background,
    flex: 1,
  },
  title: {
    color: colors.ink,
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
  },
  unread: {
    borderColor: colors.primary,
  },
});
