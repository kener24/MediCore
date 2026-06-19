import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';
import { appointmentDoctorName, appointmentPatientName } from '@/features/reception/services/receptionMappers';
import type { ReceptionAppointment } from '@/features/reception/types/receptionAppointment.types';

export function AppointmentCheckInCard({
  appointment,
  onCheckIn,
}: {
  appointment: ReceptionAppointment;
  onCheckIn: () => void;
}) {
  return (
    <AppCard style={styles.card}>
      <Text style={styles.title}>{appointmentPatientName(appointment)}</Text>
      <Text style={styles.meta}>Médico: {appointmentDoctorName(appointment)}</Text>
      <Text style={styles.meta}>Hora: {appointment.time ?? appointment.scheduled_time ?? appointment.datetime ?? 'Sin hora'}</Text>
      <Text style={styles.meta}>Modalidad: {appointment.modality ?? 'presencial'}</Text>
      <Text style={styles.meta}>Estado: {appointment.status ?? 'Sin estado'}</Text>
      <Text style={styles.meta}>Motivo: {appointment.reason ?? appointment.motivo ?? 'No registrado'}</Text>
      <View style={styles.row}>
        <Pressable onPress={onCheckIn} style={styles.button}>
          <Text style={styles.buttonText}>Hacer check-in</Text>
        </Pressable>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  button: { backgroundColor: colors.primary, borderRadius: 12, marginTop: 6, padding: 12 },
  buttonText: { color: colors.white, fontSize: 13, fontWeight: '900' },
  card: { gap: 6 },
  meta: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  row: { alignItems: 'flex-start' },
  title: { color: colors.ink, fontSize: 17, fontWeight: '900' },
});
