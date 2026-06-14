import { useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { StatusPill } from '@/features/patient/components/StatusPill';
import { cancelPatientAppointment, getPatientAppointment } from '@/features/patient/services/patientAppointmentsService';
import type { PatientAppointment } from '@/features/patient/types/patientAppointments.types';
import { formatDate, formatTime, getAppointmentTone } from '@/features/patient/utils/formatters';

export function PatientAppointmentDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { id } = route.params as { id: number };
  const [appointment, setAppointment] = useState<PatientAppointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelVisible, setCancelVisible] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setAppointment(await getPatientAppointment(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function submitCancellation() {
    if (!cancelReason.trim()) {
      Alert.alert('Cancelacion', 'Escribe el motivo de cancelacion.');
      return;
    }
    setSubmitting(true);
    try {
      const updated = await cancelPatientAppointment(id, cancelReason.trim());
      setAppointment(updated);
      setCancelVisible(false);
      setCancelReason('');
      Alert.alert('Cita cancelada', 'La cita fue cancelada correctamente.');
    } catch (err) {
      Alert.alert('Cancelacion', err instanceof Error ? err.message : 'No se pudo cancelar la cita.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState label="Cargando cita..." />;
  if (error || !appointment) {
    return <ErrorState message={error || 'No hay informacion disponible.'} onRetry={load} />;
  }

  const canCancel =
    appointment.can_cancel === true &&
    appointment.status !== 'cancelada' &&
    appointment.status !== 'atendida' &&
    appointment.status !== 'no_asistio';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppButton label="Volver" onPress={() => navigation.goBack()} variant="secondary" />
        <AppCard>
          <StatusPill label={appointment.status_display || appointment.status} tone={getAppointmentTone(appointment.status)} />
          <Text style={styles.title}>{formatDate(appointment.scheduled_date)}</Text>
          <Text style={styles.time}>
            {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
          </Text>
          <Text style={styles.doctor}>{appointment.doctor_name || appointment.doctor_nombre || 'Medico'}</Text>
          <Text style={styles.meta}>{appointment.doctor_specialty || appointment.specialty_name || 'Especialidad no indicada'}</Text>
        </AppCard>

        <AppCard>
          <Detail label="Clinica" value={appointment.clinic_nombre} />
          <Detail label="Motivo" value={appointment.reason} />
          <Detail label="Notas permitidas" value={appointment.notes} />
          <Detail label="Motivo de cancelacion" value={appointment.cancellation_reason} />
        </AppCard>

        {canCancel ? (
          <AppButton label="Cancelar cita" onPress={() => setCancelVisible(true)} variant="danger" />
        ) : null}
      </ScrollView>

      <Modal animationType="slide" transparent visible={cancelVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cancelar cita</Text>
            <Text style={styles.modalText}>Indica el motivo de cancelacion para enviarlo a la clinica.</Text>
            <TextInput
              multiline
              onChangeText={setCancelReason}
              placeholder="No podre asistir"
              placeholderTextColor="#98a2b3"
              style={styles.reasonInput}
              value={cancelReason}
            />
            <View style={styles.modalActions}>
              <AppButton label="Cerrar" onPress={() => setCancelVisible(false)} variant="secondary" />
              <AppButton label="Confirmar" loading={submitting} onPress={submitCancellation} variant="danger" />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || 'No indicado'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    padding: 22,
    paddingBottom: 34,
  },
  detailLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  detailRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: 4,
    paddingVertical: 10,
  },
  detailValue: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 21,
  },
  doctor: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 12,
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 4,
  },
  modalActions: {
    gap: 10,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    gap: 14,
    padding: 20,
    width: '100%',
  },
  modalOverlay: {
    backgroundColor: 'rgba(16, 32, 51, 0.42)',
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
  },
  modalText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  modalTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '900',
  },
  reasonInput: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.ink,
    minHeight: 110,
    padding: 14,
    textAlignVertical: 'top',
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  time: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 6,
  },
  title: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 12,
  },
});
