import { StyleSheet, Text } from 'react-native';

import { colors } from '@/core/theme/colors';

export function StatusPill({ label, tone = 'neutral' }: { label?: string; tone?: 'success' | 'warning' | 'danger' | 'neutral' }) {
  return <Text style={[styles.pill, styles[tone]]}>{label || 'Sin estado'}</Text>;
}

const styles = StyleSheet.create({
  danger: {
    backgroundColor: '#fee4e2',
    color: colors.danger,
  },
  neutral: {
    backgroundColor: '#eef2f6',
    color: colors.muted,
  },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
    textTransform: 'capitalize',
  },
  success: {
    backgroundColor: colors.palePrimary,
    color: colors.primaryDark,
  },
  warning: {
    backgroundColor: '#fff6df',
    color: colors.warning,
  },
});
