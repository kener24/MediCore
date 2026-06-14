import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';
import type { PatientNotification } from '@/features/patient/types/patientNotifications.types';
import { formatDate } from '@/features/patient/utils/formatters';

export function NotificationCard({
  notification,
  onMarkRead,
}: {
  notification: PatientNotification;
  onMarkRead?: () => void;
}) {
  const isRead = notification.is_read ?? notification.read ?? false;
  return (
    <AppCard style={!isRead && styles.unread}>
      <View style={styles.header}>
        <Text style={styles.title}>{notification.title || notification.titulo || 'Notificacion'}</Text>
        {!isRead ? <Text style={styles.badge}>Nueva</Text> : null}
      </View>
      <Text style={styles.message}>
        {notification.message || notification.mensaje || notification.body || 'Sin mensaje'}
      </Text>
      <Text style={styles.meta}>
        {notification.module || notification.modulo || 'MediCore'} ·{' '}
        {formatDate(notification.created_at || notification.creado_en)}
      </Text>
      {!isRead && onMarkRead ? (
        <Pressable onPress={onMarkRead} style={styles.action}>
          <Text style={styles.actionText}>Marcar como leida</Text>
        </Pressable>
      ) : null}
    </AppCard>
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
    fontSize: 12,
    marginTop: 8,
  },
  title: {
    color: colors.ink,
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
  },
  unread: {
    borderColor: '#a9ded8',
    borderWidth: 2,
  },
});
