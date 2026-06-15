import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/core/theme/colors';

export function DoctorHeader({
  clinicName,
  doctorName,
  onNotificationsPress,
  specialty,
  title = 'Panel médico',
  unreadCount = 0,
}: {
  clinicName?: string;
  doctorName?: string;
  onNotificationsPress?: () => void;
  specialty?: string;
  title?: string;
  unreadCount?: number;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>MediCore Médico</Text>
        <Text style={styles.title}>{doctorName ? `${title}, ${doctorName}` : title}</Text>
        <Text style={styles.subtitle}>{specialty || clinicName || 'Atención clínica móvil'}</Text>
      </View>
      <Pressable onPress={onNotificationsPress} style={styles.button}>
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
  badgeText: { color: colors.white, fontSize: 10, fontWeight: '900' },
  button: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'space-between',
  },
  copy: { flex: 1 },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 4 },
  title: { color: colors.ink, fontSize: 24, fontWeight: '900', letterSpacing: 0 },
});
