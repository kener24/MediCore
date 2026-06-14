import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';
import { StatusPill } from '@/features/patient/components/StatusPill';
import type { PatientAppointment } from '@/features/patient/types/patientAppointments.types';
import { formatDate, formatTime, getAppointmentTone } from '@/features/patient/utils/formatters';

export function AppointmentCard({
  appointment,
  onPress,
}: {
  appointment: PatientAppointment;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <AppCard>
        <View style={styles.header}>
          <View style={styles.dateBox}>
            <Text style={styles.day}>{formatDate(appointment.scheduled_date, 'shortDay')}</Text>
            <Text style={styles.time}>{formatTime(appointment.start_time)}</Text>
          </View>
          <StatusPill
            label={appointment.status_display || appointment.status}
            tone={getAppointmentTone(appointment.status)}
          />
        </View>
        <Text style={styles.title}>
          {appointment.doctor_name || appointment.doctor_nombre || 'Medico por asignar'}
        </Text>
        <Text style={styles.meta}>
          {appointment.doctor_specialty || appointment.specialty_name || 'Especialidad no indicada'}
        </Text>
        {appointment.reason ? <Text style={styles.reason}>{appointment.reason}</Text> : null}
      </AppCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dateBox: {
    flex: 1,
  },
  day: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 3,
  },
  pressed: {
    opacity: 0.85,
  },
  reason: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
  time: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
  },
  title: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
});
