import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

export function ControlCard({ description, icon, onPress, title }: { description: string; icon: IconName; onPress?: () => void; title: string }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
      <View style={styles.icon}>
        <MaterialCommunityIcons color={colors.white} name={icon} size={22} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <MaterialCommunityIcons color={colors.muted} name="chevron-right" size={22} />
    </Pressable>
  );
}

export function StatusPill({ active, label }: { active: boolean; label?: string }) {
  return (
    <View style={[styles.pill, active ? styles.pillOn : styles.pillOff]}>
      <Text style={[styles.pillText, active ? styles.pillTextOn : styles.pillTextOff]}>{label ?? (active ? 'Activo' : 'Inactivo')}</Text>
    </View>
  );
}

export function KeyValue({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || 'Sin dato'}</Text>
    </View>
  );
}

export function WarningBox({ text }: { text: string }) {
  return (
    <AppCard style={styles.warning}>
      <MaterialCommunityIcons color={colors.warning} name="alert-outline" size={24} />
      <Text style={styles.warningText}>{text}</Text>
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
  description: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  icon: {
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
  pill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillOff: {
    backgroundColor: '#fee2e2',
  },
  pillOn: {
    backgroundColor: colors.palePrimary,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '900',
  },
  pillTextOff: {
    color: colors.danger,
  },
  pillTextOn: {
    color: colors.primaryDark,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  row: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: 4,
    paddingVertical: 9,
  },
  text: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  value: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  warning: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  warningText: {
    color: colors.ink,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
});

