import { StyleSheet, Text } from 'react-native';

import { colors } from '@/core/theme/colors';

const labels: Record<string, string> = {
  cancelled: 'Cancelada',
  cancelada: 'Cancelada',
  checked_in: 'Registrado',
  completed: 'Completada',
  completada: 'Completada',
  confirmed: 'Confirmada',
  confirmada: 'Confirmada',
  in_progress: 'En consulta',
  no_show: 'No asistió',
  scheduled: 'Programada',
  waiting: 'En espera',
};

export function AppointmentStatusBadge({ status }: { status?: string | null }) {
  const normalized = status?.toLowerCase() ?? 'scheduled';
  const label = labels[normalized] ?? status ?? 'Programada';
  const success = ['completed', 'completada'].includes(normalized);
  const danger = ['cancelled', 'cancelada', 'no_show'].includes(normalized);
  const warning = ['waiting', 'checked_in', 'in_progress'].includes(normalized);

  return (
    <Text style={[styles.badge, success && styles.success, warning && styles.warning, danger && styles.danger]}>
      {label}
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
  },
  danger: { backgroundColor: '#FEF2F2', color: colors.danger },
  success: { backgroundColor: '#DCFCE7', color: colors.success },
  warning: { backgroundColor: '#FEF3C7', color: colors.warning },
});
