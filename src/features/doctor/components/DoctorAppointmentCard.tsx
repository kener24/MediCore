import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';
import { AppointmentStatusBadge } from '@/features/doctor/components/AppointmentStatusBadge';
import type { DoctorAppointment } from '@/features/doctor/types/doctorSchedule.types';
import { formatDate, formatTime } from '@/features/patient/utils/formatters';

export function DoctorAppointmentCard({
  appointment,
  onAttend,
  onPress,
}: {
  appointment: DoctorAppointment;
  onAttend?: () => void;
  onPress?: () => void;
}) {
  const patientName =
    appointment.patient_name ?? appointment.patient_nombre ?? appointment.paciente_nombre ?? 'Paciente no indicado';
  const status = appointment.status ?? appointment.estado;
  const visitId = appointment.visit_id ?? appointment.visita_id;
  const normalizedStatus = status?.toLowerCase() ?? '';
  const canAttend = Boolean(visitId) && !['completed', 'completada', 'cancelled', 'cancelada', 'no_show'].includes(normalizedStatus);
  const demographic =
    [appointment.patient_age ? `${appointment.patient_age} anos` : null, appointment.patient_gender].filter(Boolean).join(' - ') ||
    'Datos demograficos no indicados';

  return (
    <Pressable onPress={onPress}>
      <AppCard style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.time}>
            {formatTime(appointment.start_time ?? appointment.hora_inicio)} -{' '}
            {formatTime(appointment.end_time ?? appointment.hora_fin)}
          </Text>
          <AppointmentStatusBadge status={status} />
        </View>
        <Text style={styles.title}>{patientName}</Text>
        <Text style={styles.meta}>{demographic}</Text>
        <Text style={styles.meta}>{formatDate(appointment.scheduled_date ?? appointment.fecha)}</Text>
        <Text style={styles.reason}>{appointment.reason ?? appointment.motivo ?? 'Motivo no indicado'}</Text>
        {visitId ? <Text style={styles.visit}>Visita asociada</Text> : null}
        <View style={styles.actions}>
          <AppButton label="Ver" onPress={onPress} style={styles.button} variant="secondary" />
          {canAttend ? <AppButton label="Atender" onPress={onAttend} style={styles.button} /> : null}
        </View>
      </AppCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 8, marginTop: 6 },
  button: { flex: 1, height: 44 },
  card: { gap: 7 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  meta: { color: colors.muted, fontSize: 12 },
  reason: { color: colors.ink, fontSize: 14, lineHeight: 20 },
  time: { color: colors.primary, fontSize: 16, fontWeight: '900' },
  title: { color: colors.ink, fontSize: 17, fontWeight: '900' },
  visit: { color: colors.success, fontSize: 12, fontWeight: '900' },
});
