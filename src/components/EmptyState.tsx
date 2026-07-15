import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors } from '@/core/theme/colors';

type EmptyStateTone = 'default' | 'info' | 'success' | 'warning';

const toneStyles = {
  default: { background: colors.surface, border: colors.border, iconBackground: colors.palePrimary, icon: colors.primary },
  info: { background: '#EFF6FF', border: '#BFDBFE', iconBackground: '#DBEAFE', icon: colors.primary },
  success: { background: '#F0FDF4', border: '#BBF7D0', iconBackground: '#DCFCE7', icon: colors.success },
  warning: { background: '#FFFBEB', border: '#FDE68A', iconBackground: '#FEF3C7', icon: colors.warning },
} as const;

export function EmptyState({
  actionLabel,
  compact = false,
  description,
  icon = 'inbox-outline',
  onAction,
  style,
  title,
  tone = 'default',
}: {
  actionLabel?: string;
  compact?: boolean;
  description?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  onAction?: () => void;
  style?: ViewStyle;
  title: string;
  tone?: EmptyStateTone;
}) {
  const palette = toneStyles[tone];

  return (
    <View style={[styles.container, compact && styles.compact, { backgroundColor: palette.background, borderColor: palette.border }, style]}>
      <View style={[styles.iconWrap, { backgroundColor: palette.iconBackground }]}>
        <MaterialCommunityIcons color={palette.icon} name={icon} size={compact ? 24 : 34} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  actionText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
  },
  compact: {
    padding: 16,
  },
  container: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    padding: 22,
  },
  description: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    textAlign: 'center',
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 999,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  title: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 10,
    textAlign: 'center',
  },
});
