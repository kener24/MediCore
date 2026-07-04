import { useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { formatDate, formatDateTime, formatTime } from '@/core/utils/dateUtils';
import { AppointmentStatusBadge } from '@/features/patient/components/AppointmentStatusBadge';
import { CancelAppointmentModal } from '@/features/patient/components/CancelAppointmentModal';
import { cancelPatientAppointment, getPatientAppointment } from '@/features/patient/services/patientAppointmentsService';
import type { PatientAppointment } from '@/features/patient/types/patientAppointments.types';

export function PatientAppointmentDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const routeParams = (route.params ?? {}) as { id?: number | string };
  const id = Number(routeParams.id);
  const hasValidId = Number.isFinite(id) && id > 0;
  const [appointment, setAppointment] = useState<PatientAppointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelVisible, setCancelVisible] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    if (!hasValidId) {
      setError('No se encontró la cita solicitada.');
      setLoading(false);
      return;
    }
    try {
      setAppointment(await getPatientAppointment(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos.');
    } finally {
      setLoading(false);
    }
  }, [hasValidId, id]);

  useEffect(() => {
    load();
  }, [load]);

  async function submitCancellation() {
    if (!hasValidId) return;
    if (cancelReason.trim().length < 5) {
      Alert.alert('Cancelación', 'Escribe un motivo de cancelación claro.');
      return;
    }
    setSubmitting(true);
    try {
      const updated = await cancelPatientAppointment(id, cancelReason.trim());
      setAppointment(updated);
      await load();
      setCancelVisible(false);
      setCancelReason('');
      Alert.alert('Cita cancelada', 'La cita fue cancelada correctamente.');
    } catch (err) {
      Alert.alert('Cancelación', err instanceof Error ? err.message : 'No se pudo cancelar la cita.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState label="Cargando cita..." />;
  if (error || !appointment) {
    return <ErrorState message={error || 'No hay información disponible.'} onRetry={load} />;
  }

  const canCancel =
    (appointment.can_cancel === true ||
      appointment.status === 'scheduled' ||
      appointment.status === 'confirmed' ||
      appointment.status === 'pendiente' ||
      appointment.status === 'confirmada') &&
    appointment.status !== 'cancelled' &&
    appointment.status !== 'cancelada' &&
    appointment.status !== 'completed' &&
    appointment.status !== 'atendida' &&
    appointment.status !== 'no_show' &&
    appointment.status !== 'no_asistio' &&
    appointment.status !== 'in_progress';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppButton label="Volver" onPress={() => navigation.goBack()} variant="secondary" />
        <AppCard>
          <AppointmentStatusBadge status={appointment.status} />
          <Text style={styles.title}>{formatDate(appointment.scheduled_date)}</Text>
          <Text style={styles.time}>
            {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
          </Text>
          <Text style={styles.doctor}>{appointment.doctor_name || appointment.doctor_nombre || 'Médico'}</Text>
          <Text style={styles.meta}>{appointment.doctor_specialty || appointment.specialty_name || appointment.specialty_nombre || 'Especialidad no indicada'}</Text>
        </AppCard>

        <AppCard>
          <Detail label="Clínica" value={appointment.clinic_name || appointment.clinic_nombre} />
          <Detail label="Modalidad" value={appointment.modality === 'online' ? 'En línea' : 'Presencial'} />
          <Detail label="Motivo" value={appointment.reason} />
          <Detail label="Notas permitidas" value={appointment.notes} />
          <Detail label="Instrucciones" value={appointment.instructions} />
          <Detail label="Creada" value={formatDateTime(appointment.created_at || appointment.creado_en)} />
          <Detail label="Motivo de cancelación" value={appointment.cancellation_reason} />
        </AppCard>

        {canCancel ? (
          <>
            <AppButton
              label="Solicitar reprogramación"
              onPress={() =>
                navigation.navigate('RequestAppointment' as never, {
                  previousAppointmentDate: formatDate(appointment.scheduled_date),
                  previousAppointmentDoctor: appointment.doctor_name || appointment.doctor_nombre,
                  rescheduleFrom: appointment.id,
                } as never)
              }
              variant="secondary"
            />
            <AppButton label="Cancelar cita" onPress={() => setCancelVisible(true)} variant="danger" />
          </>
        ) : null}
      </ScrollView>

      <CancelAppointmentModal
        loading={submitting}
        onCancel={() => setCancelVisible(false)}
        onChangeReason={setCancelReason}
        onConfirm={submitCancellation}
        reason={cancelReason}
        visible={cancelVisible}
      />
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
  content: { gap: 14, padding: 22, paddingBottom: 118 },
  detailLabel: { color: colors.muted, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  detailRow: { borderBottomColor: colors.border, borderBottomWidth: 1, gap: 4, paddingVertical: 10 },
  detailValue: { color: colors.ink, fontSize: 15, lineHeight: 21 },
  doctor: { color: colors.ink, fontSize: 17, fontWeight: '900', marginTop: 12 },
  meta: { color: colors.muted, fontSize: 14, marginTop: 4 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  time: { color: colors.primary, fontSize: 18, fontWeight: '900', marginTop: 6 },
  title: { color: colors.ink, fontSize: 24, fontWeight: '900', marginTop: 12 },
});
