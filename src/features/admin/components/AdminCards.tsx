import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

export function AdminActionCard({
  description,
  icon,
  onPress,
  title,
}: {
  description: string;
  icon: IconName;
  onPress?: () => void;
  title: string;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
      <View style={styles.iconBox}>
        <MaterialCommunityIcons color={colors.white} name={icon} size={22} />
      </View>
      <View style={styles.actionText}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <MaterialCommunityIcons color={colors.muted} name="chevron-right" size={22} />
    </Pressable>
  );
}

export function AdminInfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || 'Sin dato'}</Text>
    </View>
  );
}

export function AdminStatusCard({
  description,
  icon,
  title,
  tone = 'primary',
}: {
  description: string;
  icon: IconName;
  title: string;
  tone?: 'primary' | 'warning' | 'danger';
}) {
  return (
    <AppCard style={styles.statusCard}>
      <View style={[styles.statusIcon, styles[tone]]}>
        <MaterialCommunityIcons color={colors.white} name={icon} size={22} />
      </View>
      <View style={styles.actionText}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 15,
  },
  actionText: {
    flex: 1,
    gap: 3,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  description: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  iconBox: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  primary: {
    backgroundColor: colors.primary,
  },
  row: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: 4,
    paddingVertical: 10,
  },
  statusCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  statusIcon: {
    alignItems: 'center',
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  title: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  value: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  warning: {
    backgroundColor: colors.warning,
  },
});

