import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';
import { formatShortDate, formatTime } from '@/core/utils/dateUtils';
import { AppointmentStatusBadge } from '@/features/patient/components/AppointmentStatusBadge';
import type { PatientAppointment } from '@/features/patient/types/patientAppointments.types';

export function AppointmentCard({
  appointment,
  onPress,
}: {
  appointment: PatientAppointment;
  onPress?: () => void;
}) {
  const modalityLabel = appointment.modality === 'online' ? 'En línea' : 'Presencial';
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <AppCard>
        <View style={styles.header}>
          <View style={styles.dateBox}>
            <Text style={styles.day}>{formatShortDate(appointment.scheduled_date)}</Text>
            <Text style={styles.time}>{formatTime(appointment.start_time)}</Text>
          </View>
          <View style={styles.badges}>
            <Text style={styles.modalityBadge}>{modalityLabel}</Text>
            <AppointmentStatusBadge status={appointment.status} />
          </View>
        </View>
        <Text style={styles.title}>
          {appointment.doctor_name || appointment.doctor_nombre || 'Médico por asignar'}
        </Text>
        <Text style={styles.meta}>
          {appointment.doctor_specialty ||
            appointment.specialty_name ||
            appointment.specialty_nombre ||
            'Especialidad no indicada'}
        </Text>
        {appointment.reason ? <Text style={styles.reason}>{appointment.reason}</Text> : null}
        <Text style={styles.detailText}>Ver detalle</Text>
      </AppCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dateBox: {
    flex: 1,
  },
  badges: {
    alignItems: 'flex-end',
    gap: 6,
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
  detailText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 12,
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 3,
  },
  modalityBadge: {
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
