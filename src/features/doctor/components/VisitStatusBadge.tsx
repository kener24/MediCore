import { StyleSheet, Text } from 'react-native';

import { colors } from '@/core/theme/colors';

const labels: Record<string, string> = {
  checked_in: 'Registrado',
  in_consultation: 'En consulta',
  in_progress: 'En consulta',
  in_triage_completed: 'Triaje completo',
  ready_for_doctor: 'Listo para médico',
  waiting: 'En espera',
  waiting_doctor: 'Esperando médico',
};

export function VisitStatusBadge({ status }: { status?: string | null }) {
  const normalized = status?.toLowerCase() ?? 'waiting';
  const label = labels[normalized] ?? status ?? 'En espera';
  const active = ['in_consultation', 'in_progress'].includes(normalized);
  const success = ['ready_for_doctor', 'in_triage_completed'].includes(normalized);
  return <Text style={[styles.badge, active && styles.active, success && styles.success]}>{label}</Text>;
}

const styles = StyleSheet.create({
  active: { backgroundColor: '#FEF3C7', color: colors.warning },
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
  success: { backgroundColor: '#DCFCE7', color: colors.success },
});
