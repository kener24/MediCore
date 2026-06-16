import { StyleSheet, Text } from 'react-native';

import { colors } from '@/core/theme/colors';

const labels: Record<string, string> = {
  cancelled: 'Cancelada',
  completed: 'Finalizada',
  draft: 'Borrador',
  in_consultation: 'En consulta',
  in_progress: 'En progreso',
  pending: 'Pendiente',
};

export function ConsultationStatusBadge({ status }: { status?: string | null }) {
  const normalized = status?.toLowerCase() ?? 'pending';
  const success = ['completed', 'complete', 'finalizada', 'atendida'].includes(normalized);
  const danger = ['cancelled', 'cancelada', 'no_show', 'no asistió'].includes(normalized);
  const warning = ['draft', 'pending', 'pendiente'].includes(normalized);
  return (
    <Text style={[styles.badge, success && styles.success, warning && styles.warning, danger && styles.danger]}>
      {labels[normalized] ?? status ?? 'Pendiente'}
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
  danger: { backgroundColor: '#FEF2F2', color: colors.danger },
  success: { backgroundColor: '#DCFCE7', color: colors.success },
  warning: { backgroundColor: '#FEF3C7', color: colors.warning },
});
