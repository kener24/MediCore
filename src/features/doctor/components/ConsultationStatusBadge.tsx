import { StyleSheet, Text } from 'react-native';

import { colors } from '@/core/theme/colors';

export function ConsultationStatusBadge({ status }: { status?: string | null }) {
  const value = status || 'Pendiente';
  const normalized = value.toLowerCase();
  const success = ['completed', 'complete', 'finalizada', 'atendida'].includes(normalized);
  const danger = ['cancelled', 'cancelada', 'no_show', 'no asistió'].includes(normalized);
  const warning = ['pending', 'pendiente', 'in_progress', 'en curso'].includes(normalized);
  return (
    <Text style={[styles.badge, success && styles.success, warning && styles.warning, danger && styles.danger]}>
      {value}
    </Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 5,
    textTransform: 'uppercase',
  },
  danger: { backgroundColor: '#FEF2F2', color: colors.danger },
  success: { backgroundColor: '#DCFCE7', color: colors.success },
  warning: { backgroundColor: '#FEF3C7', color: colors.warning },
});
