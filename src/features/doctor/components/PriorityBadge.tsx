import { StyleSheet, Text } from 'react-native';

import { colors } from '@/core/theme/colors';

export function PriorityBadge({ value }: { value?: string | null }) {
  const normalized = value?.toLowerCase() ?? 'normal';
  const emergency = ['emergency', 'emergencia', 'critical'].includes(normalized);
  const danger = ['urgent', 'urgente', 'alta', 'high'].includes(normalized);
  const warning = ['priority', 'prioridad', 'media', 'medium', 'prioritaria'].includes(normalized);
  const labelMap: Record<string, string> = {
    emergency: 'Emergencia',
    emergencia: 'Emergencia',
    normal: 'Normal',
    priority: 'Prioridad',
    prioridad: 'Prioridad',
    urgent: 'Urgente',
    urgente: 'Urgente',
  };
  return (
    <Text style={[styles.badge, emergency && styles.emergency, danger && styles.danger, warning && styles.warning]}>
      {labelMap[normalized] ?? value ?? 'Normal'}
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
    backgroundColor: '#FFEDD5',
    color: '#C2410C',
  },
  emergency: {
    backgroundColor: '#FEF2F2',
    color: colors.danger,
  },
  warning: {
    backgroundColor: '#FEF3C7',
    color: colors.warning,
  },
});
