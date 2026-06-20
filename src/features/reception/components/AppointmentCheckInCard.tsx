import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';
import { appointmentDoctorName, appointmentPatientName } from '@/features/reception/services/receptionMappers';
import type { ReceptionAppointment } from '@/features/reception/types/receptionAppointment.types';

export function AppointmentCheckInCard({
  appointment,
  disabled,
  loading,
  onCheckIn,
  onViewVisit,
}: {
  appointment: ReceptionAppointment;
  disabled?: boolean;
  loading?: boolean;
  onCheckIn: () => void;
  onViewVisit?: () => void;
}) {
  const state = appointmentState(appointment);
  const canCheckIn = !disabled && !loading && ['scheduled', 'confirmed', 'pending'].includes(state.key);

  return (
    <AppCard style={styles.card}>
      <Text style={styles.title}>{appointmentPatientName(appointment)}</Text>
      <Text style={styles.meta}>Medico: {appointmentDoctorName(appointment)}</Text>
      <Text style={styles.meta}>Hora: {appointment.time ?? appointment.scheduled_time ?? appointment.datetime ?? 'Sin hora'}</Text>
      <Text style={styles.meta}>Modalidad: {appointment.modality ?? 'presencial'}</Text>
      <Text style={[styles.status, state.style]}>{state.label}</Text>
      <Text style={styles.meta}>Motivo: {appointment.reason ?? appointment.motivo ?? 'No registrado'}</Text>
      <View style={styles.row}>
        {state.key === 'checked_in' && onViewVisit ? (
          <Pressable onPress={onViewVisit} style={[styles.button, styles.secondaryButton]}>
            <Text style={[styles.buttonText, styles.secondaryText]}>Ver visita</Text>
          </Pressable>
        ) : (
          <Pressable disabled={!canCheckIn} onPress={onCheckIn} style={[styles.button, !canCheckIn && styles.disabledButton]}>
            {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Hacer check-in</Text>}
          </Pressable>
        )}
      </View>
    </AppCard>
  );
}

function appointmentState(appointment: ReceptionAppointment) {
  const status = String(appointment.status ?? '').toLowerCase();
  if (
    appointment.checked_in ||
    appointment.visit_id ||
    appointment.admission_id ||
    appointment.check_in_visit_id ||
    status.includes('check') ||
    status.includes('attended') ||
    status.includes('atendida')
  ) {
    return { key: 'checked_in', label: 'Con check-in', style: styles.statusSuccess };
  }
  if (status.includes('cancel') || status.includes('anulad')) return { key: 'cancelled', label: 'Cancelada', style: styles.statusDanger };
  if (status.includes('confirm')) return { key: 'confirmed', label: 'Confirmada', style: styles.statusInfo };
  if (status.includes('pend') || status.includes('sched') || status.includes('program')) return { key: 'scheduled', label: 'Pendiente', style: styles.statusWarning };
  return { key: 'pending', label: appointment.status ?? 'Pendiente', style: styles.statusWarning };
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 12, marginTop: 6, minHeight: 44, padding: 12 },
  buttonText: { color: colors.white, fontSize: 13, fontWeight: '900' },
  card: { gap: 6 },
  disabledButton: { opacity: 0.45 },
  meta: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  row: { alignItems: 'flex-start' },
  secondaryButton: { backgroundColor: colors.palePrimary, borderColor: '#ccebe7', borderWidth: 1 },
  secondaryText: { color: colors.primaryDark },
  status: { alignSelf: 'flex-start', borderRadius: 999, fontSize: 12, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 5 },
  statusDanger: { backgroundColor: '#fee2e2', color: colors.danger },
  statusInfo: { backgroundColor: '#dbeafe', color: '#1d4ed8' },
  statusSuccess: { backgroundColor: '#dcfce7', color: '#15803d' },
  statusWarning: { backgroundColor: '#fef3c7', color: '#92400e' },
  title: { color: colors.ink, fontSize: 17, fontWeight: '900' },
});
