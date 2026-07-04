import { StyleSheet, Text } from 'react-native';

import { colors } from '@/core/theme/colors';
import type { AppointmentStatus } from '@/features/patient/types/patientAppointments.types';

const labels: Record<string, string> = {
  atendida: 'Completada',
  cancelada: 'Cancelada',
  checked_in: 'Registrado',
  completed: 'Completada',
  confirmada: 'Confirmada',
  confirmed: 'Confirmada',
  in_progress: 'En consulta',
  no_asistio: 'No asisti?',
  no_show: 'No asisti?',
  pendiente: 'Programada',
  reprogramada: 'Reprogramada',
  scheduled: 'Programada',
};

function tone(status?: AppointmentStatus) {
  if (status === 'confirmed' || status === 'confirmada' || status === 'scheduled' || status === 'pendiente') {
    return styles.success;
  }
  if (status === 'checked_in' || status === 'in_progress' || status === 'reprogramada') return styles.warning;
  if (status === 'completed' || status === 'atendida') return styles.info;
  if (status === 'cancelled' || status === 'cancelada' || status === 'no_show' || status === 'no_asistio') {
    return styles.danger;
  }
  return styles.neutral;
}

export function AppointmentStatusBadge({ status }: { status?: AppointmentStatus }) {
  return <Text style={[styles.badge, tone(status)]}>{labels[String(status)] ?? status ?? 'Sin estado'}</Text>;
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  danger: {
    backgroundColor: '#FEE2E2',
    color: colors.danger,
  },
  info: {
    backgroundColor: '#DBEAFE',
    color: colors.primaryDark,
  },
  neutral: {
    backgroundColor: '#E2E8F0',
    color: colors.muted,
  },
  success: {
    backgroundColor: '#DCFCE7',
    color: colors.success,
  },
  warning: {
    backgroundColor: '#FEF3C7',
    color: colors.warning,
  },
});
