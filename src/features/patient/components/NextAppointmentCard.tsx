import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';
import { formatDate, formatTime } from '@/core/utils/dateUtils';
import { StatusPill } from '@/features/patient/components/StatusPill';
import type { PatientAppointment } from '@/features/patient/types/patientAppointments.types';
import { getAppointmentTone } from '@/features/patient/utils/formatters';

export function NextAppointmentCard({
  appointment,
  onRequestAppointment,
  onViewDetail,
}: {
  appointment: PatientAppointment | null;
  onRequestAppointment: () => void;
  onViewDetail: () => void;
}) {
  if (!appointment) {
    return (
      <AppCard style={styles.emptyCard}>
        <View style={styles.emptyIcon}>
          <MaterialCommunityIcons color={colors.primary} name="calendar-plus" size={28} />
        </View>
        <Text style={styles.title}>No tienes citas próximas.</Text>
        <Text style={styles.description}>Puedes solicitar una cita desde tu portal paciente.</Text>
        <AppButton label="Solicitar cita" onPress={onRequestAppointment} />
      </AppCard>
    );
  }

  return (
    <AppCard style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Próxima cita</Text>
          <Text style={styles.date}>{formatDate(appointment.scheduled_date)}</Text>
        </View>
        <StatusPill label={appointment.status_display || appointment.status} tone={getAppointmentTone(appointment.status)} />
      </View>
      <View style={styles.timeRow}>
        <MaterialCommunityIcons color={colors.primary} name="clock-outline" size={20} />
        <Text style={styles.time}>
          {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
        </Text>
      </View>
      <Text style={styles.doctor}>{appointment.doctor_name || appointment.doctor_nombre || 'Médico por asignar'}</Text>
      <Text style={styles.specialty}>{appointment.specialty_name || appointment.doctor_specialty || 'Especialidad no indicada'}</Text>
      <Text style={styles.modality}>{appointment.modality === 'online' ? 'En línea' : 'Presencial'}</Text>
      {appointment.reason ? <Text style={styles.reason}>{appointment.reason}</Text> : null}
      <AppButton label="Ver detalle" onPress={onViewDetail} variant="secondary" />
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  date: { color: colors.ink, fontSize: 21, fontWeight: '900', marginTop: 3 },
  description: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  doctor: { color: colors.ink, fontSize: 17, fontWeight: '900' },
  emptyCard: { alignItems: 'center', gap: 12 },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: colors.palePrimary,
    borderRadius: 18,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  header: { alignItems: 'flex-start', flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  modality: {
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
  reason: { color: colors.ink, fontSize: 13, lineHeight: 19 },
  specialty: { color: colors.muted, fontSize: 14 },
  time: { color: colors.primaryDark, fontSize: 15, fontWeight: '900' },
  timeRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  title: { color: colors.ink, fontSize: 19, fontWeight: '900', textAlign: 'center' },
});
