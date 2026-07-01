import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HeaderBackButton } from '@/components/HeaderBackButton';
import { colors } from '@/core/theme/colors';

interface PatientHeaderProps {
  clinicName?: string;
  name?: string;
  onNotificationsPress?: () => void;
  patientName?: string;
  subtitle?: string;
  title?: string;
  unreadCount?: number;
}

export function PatientHeader({
  clinicName,
  name,
  onNotificationsPress,
  patientName,
  subtitle,
  title = 'Hola',
  unreadCount = 0,
}: PatientHeaderProps) {
  const displayName = patientName ?? name;
  return (
    <View style={styles.container}>
      <HeaderBackButton />
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>MediCore Paciente</Text>
        <Text style={styles.title}>{displayName ? `${title}, ${displayName}` : title}</Text>
        <Text style={styles.subtitle}>{subtitle ?? clinicName ?? 'Bienvenido a MediCore'}</Text>
      </View>
      <Pressable onPress={onNotificationsPress} style={styles.notificationButton}>
        <MaterialCommunityIcons color={colors.primary} name="bell-outline" size={23} />
        {unreadCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'space-between',
  },
  badge: {
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderRadius: 999,
    minWidth: 20,
    paddingHorizontal: 5,
    paddingVertical: 2,
    position: 'absolute',
    right: -4,
    top: -6,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '900',
  },
  copy: {
    flex: 1,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  title: {
    color: colors.ink,
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: 0,
  },
  notificationButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
});
