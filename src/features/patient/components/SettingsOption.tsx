import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/core/theme/colors';

export function SettingsOption({
  danger,
  icon,
  onPress,
  subtitle,
  title,
}: {
  danger?: boolean;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
  subtitle?: string;
  title: string;
}) {
  const tone = danger ? colors.danger : colors.primary;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.iconShell, danger && styles.dangerShell]}>
        <MaterialCommunityIcons color={tone} name={icon} size={22} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, danger && styles.dangerText]}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <MaterialCommunityIcons color={colors.muted} name="chevron-right" size={22} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  copy: {
    flex: 1,
    gap: 3,
  },
  dangerShell: {
    backgroundColor: '#FEF2F2',
  },
  dangerText: {
    color: colors.danger,
  },
  iconShell: {
    alignItems: 'center',
    backgroundColor: colors.palePrimary,
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  pressed: {
    opacity: 0.75,
  },
  row: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 13,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 12,
  },
  title: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
});
