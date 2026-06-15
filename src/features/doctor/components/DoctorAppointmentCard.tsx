import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';
import { formatDate, formatTime } from '@/features/patient/utils/formatters';
import { ConsultationStatusBadge } from '@/features/doctor/components/ConsultationStatusBadge';
import type { DoctorAppointment } from '@/features/doctor/types/doctorSchedule.types';

export function DoctorAppointmentCard({
  appointment,
  onPress,
}: {
  appointment: DoctorAppointment;
  onPress?: () => void;
}) {
  const patientName = appointment.patient_name ?? appointment.paciente_nombre ?? 'Paciente no indicado';
  const status = appointment.status ?? appointment.estado;
  return (
    <Pressable onPress={onPress}>
      <AppCard style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.time}>
            {formatTime(appointment.start_time ?? appointment.hora_inicio)} -{' '}
            {formatTime(appointment.end_time ?? appointment.hora_fin)}
          </Text>
          <ConsultationStatusBadge status={status} />
        </View>
        <Text style={styles.title}>{patientName}</Text>
        <Text style={styles.meta}>{formatDate(appointment.scheduled_date ?? appointment.fecha)}</Text>
        <Text style={styles.reason}>{appointment.reason ?? appointment.motivo ?? 'Motivo no indicado'}</Text>
        {appointment.visit_id ?? appointment.visita_id ? (
          <Text style={styles.visit}>Visita asociada</Text>
        ) : null}
      </AppCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: 7 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  meta: { color: colors.muted, fontSize: 12 },
  reason: { color: colors.ink, fontSize: 14, lineHeight: 20 },
  time: { color: colors.primary, fontSize: 16, fontWeight: '900' },
  title: { color: colors.ink, fontSize: 17, fontWeight: '900' },
  visit: { color: colors.success, fontSize: 12, fontWeight: '900' },
});
