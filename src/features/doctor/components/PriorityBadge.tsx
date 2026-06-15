import { StyleSheet, Text } from 'react-native';

import { colors } from '@/core/theme/colors';

export function PriorityBadge({ value }: { value?: string | null }) {
  const normalized = value?.toLowerCase() ?? 'normal';
  const danger = ['alta', 'high', 'urgent', 'urgente', 'critical'].includes(normalized);
  const warning = ['media', 'medium', 'prioritaria'].includes(normalized);
  return (
    <Text style={[styles.badge, danger && styles.danger, warning && styles.warning]}>
      {value || 'Normal'}
    </Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.palePrimary,
    borderRadius: 999,
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 5,
    textTransform: 'uppercase',
  },
  danger: {
    backgroundColor: '#FEF2F2',
    color: colors.danger,
  },
  warning: {
    backgroundColor: '#FEF3C7',
    color: colors.warning,
  },
});
