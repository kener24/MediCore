import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';
import type { PatientNotification } from '@/features/patient/types/patientNotifications.types';
import { formatDate } from '@/features/patient/utils/formatters';

export function isNotificationRead(notification: PatientNotification) {
  const status = notification.status?.toLowerCase();
  if (typeof notification.is_read === 'boolean') return notification.is_read;
  if (typeof notification.read === 'boolean') return notification.read;
  if (notification.read_at) return true;
  if (status) return ['read', 'leida', 'leido'].includes(status);
  return false;
}

export function NotificationCard({
  notification,
  onMarkAsRead,
  onMarkRead,
  onPress,
}: {
  notification: PatientNotification;
  onMarkAsRead?: () => void;
  onMarkRead?: () => void;
  onPress?: () => void;
}) {
  const isRead = isNotificationRead(notification);
  const markRead = onMarkAsRead ?? onMarkRead;
  const title = notification.title || notification.titulo || 'Notificación';
  const message = notification.message || notification.mensaje || notification.body || 'Sin mensaje';
  const meta =
    notification.type ||
    notification.tipo ||
    notification.notification_type ||
    notification.module ||
    notification.modulo ||
    'MediCore';

  return (
    <Pressable onPress={onPress}>
      <AppCard style={[styles.card, !isRead && styles.unread]}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            {!isRead ? <View style={styles.dot} /> : null}
            <Text style={styles.title}>{title}</Text>
          </View>
          {!isRead ? <Text style={styles.badge}>Nueva</Text> : null}
        </View>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.metaRow}>
          <MaterialCommunityIcons color={colors.muted} name="bell-outline" size={16} />
          <Text style={styles.meta}>
            {meta} - {formatDate(notification.created_at || notification.creado_en)}
          </Text>
        </View>
        {!isRead && markRead ? (
          <Pressable onPress={markRead} style={styles.action}>
            <Text style={styles.actionText}>Marcar como leída</Text>
          </Pressable>
        ) : null}
      </AppCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: {
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  actionText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    color: colors.white,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  card: {
    gap: 0,
  },
  dot: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 10,
    marginTop: 5,
    width: 10,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  message: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  meta: {
    color: colors.muted,
    flex: 1,
    fontSize: 12,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  title: {
    color: colors.ink,
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
  },
  titleRow: {
    alignItems: 'flex-start',
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  unread: {
    borderColor: '#a9c9ff',
    borderWidth: 2,
  },
});
