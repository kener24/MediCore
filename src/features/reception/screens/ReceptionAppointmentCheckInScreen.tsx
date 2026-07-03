import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { AppInput } from '@/components/AppInput';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { AppointmentCheckInCard } from '@/features/reception/components/AppointmentCheckInCard';
import { appointmentDoctorName, appointmentPatientName } from '@/features/reception/services/receptionMappers';
import { checkInAppointment, getTodayAppointments } from '@/features/reception/services/receptionAppointmentService';
import type { ReceptionAppointment } from '@/features/reception/types/receptionAppointment.types';

const filters = [['all', 'Todas'], ['scheduled', 'Pendientes'], ['confirmed', 'Confirmadas'], ['checked_in', 'Con check-in'], ['cancelled', 'Canceladas']] as const;

export function ReceptionAppointmentCheckInScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const initialFilter = String(route.params?.initialFilter ?? 'all');
  const [appointments, setAppointments] = useState<ReceptionAppointment[]>([]);
  const [filter, setFilter] = useState(initialFilter);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setAppointments(await getTodayAppointments());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las citas.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useEffect(() => {
    if (initialFilter && initialFilter !== filter) setFilter(initialFilter);
  }, [filter, initialFilter]);

  const summary = useMemo(() => ({
    cancelled: appointments.filter((item) => appointmentFilterKey(item) === 'cancelled').length,
    checkedIn: appointments.filter((item) => appointmentFilterKey(item) === 'checked_in').length,
    pending: appointments.filter((item) => ['scheduled', 'confirmed'].includes(appointmentFilterKey(item))).length,
    total: appointments.length,
  }), [appointments]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return appointments.filter((item) => {
      if (filter !== 'all' && appointmentFilterKey(item) !== filter) return false;
      if (!needle) return true;
      const searchable = [
        appointmentPatientName(item),
        appointmentDoctorName(item),
        item.reason,
        item.motivo,
        item.time,
        item.scheduled_time,
        item.status,
      ].join(' ').toLowerCase();
      return searchable.includes(needle);
    });
  }, [appointments, filter, search]);

  function confirmCheckIn(item: ReceptionAppointment) {
    if (!item.id) return;
    Alert.alert('Check-in de cita', 'Despues de registrar la llegada se creara la visita operativa. Deseas continuar?', [
      { style: 'cancel', text: 'Cancelar' },
      { text: 'Confirmar', onPress: () => void checkIn(item) },
    ]);
  }

  async function checkIn(item: ReceptionAppointment) {
    if (!item.id || processingId) return;
    setProcessingId(item.id);
    try {
      const result = await checkInAppointment(item.id);
      await load(true);
      const visitId = result.visit?.id ?? result.visitId;
      if (visitId) {
        Alert.alert('Check-in', 'Check-in realizado correctamente.', [
          { text: 'Ver visita', onPress: () => navigation.navigate('ReceptionVisitDetail', { visitId }) },
          { text: 'Agenda', onPress: () => setFilter('checked_in') },
        ]);
      } else {
        Alert.alert('Check-in', result.message ?? 'Check-in realizado correctamente.');
      }
    } catch (err) {
      Alert.alert('Check-in', err instanceof Error ? err.message : 'No se pudo realizar el check-in.');
    } finally {
      setProcessingId(null);
    }
  }

  if (loading) return <LoadingState label="Cargando citas..." />;
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
        <AppHeader icon="calendar-check-outline" subtitle="Citas del dia listas para registrar llegada." title="Check-in de cita" />
        <AppCard style={styles.summary}>
          <Info value={String(summary.total)} label="Citas" />
          <Info value={String(summary.pending)} label="Por recibir" />
          <Info value={String(summary.checkedIn)} label="Recibidas" />
          <Info value={String(summary.cancelled)} label="Canceladas" />
        </AppCard>
        <View style={styles.filters}>{filters.map(([value, label]) => <Text key={value} onPress={() => setFilter(value)} style={[styles.filter, filter === value && styles.filterActive]}>{label}</Text>)}</View>
        <AppInput autoCapitalize="none" label="Buscar cita" onChangeText={setSearch} placeholder="Paciente, medico, hora o motivo" value={search} />
        {error ? <ErrorState message={error} onRetry={() => void load()} title="No se pudo cargar" /> : null}
        {!error && visible.length === 0 ? <EmptyState description="No hay citas para este filtro o busqueda." title="Sin citas" /> : null}
        {visible.map((appointment) => (
          <AppointmentCheckInCard
            appointment={appointment}
            disabled={Boolean(processingId && processingId !== appointment.id)}
            key={appointment.id}
            loading={processingId === appointment.id}
            onCheckIn={() => confirmCheckIn(appointment)}
            onViewVisit={() => {
              const visitId = appointment.visit_id ?? appointment.admission_id ?? appointment.check_in_visit_id ?? (typeof appointment.visit === 'number' ? appointment.visit : undefined);
              if (visitId) navigation.navigate('ReceptionVisitDetail', { visitId });
            }}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoValue}>{value}</Text>
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
  );
}

function appointmentFilterKey(appointment: ReceptionAppointment) {
  const status = String(appointment.status ?? '').toLowerCase();
  if (
    appointment.checked_in ||
    appointment.visit_id ||
    appointment.admission_id ||
    appointment.check_in_visit_id ||
    status.includes('check') ||
    status.includes('attended') ||
    status.includes('atendida')
  ) return 'checked_in';
  if (status.includes('cancel') || status.includes('anulad')) return 'cancelled';
  if (status.includes('confirm')) return 'confirmed';
  return 'scheduled';
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 18, paddingBottom: 120 },
  filter: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: 999, borderWidth: 1, color: colors.muted, fontSize: 12, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 9 },
  filterActive: { backgroundColor: colors.primary, borderColor: colors.primary, color: colors.white },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  info: { flex: 1, minWidth: 70 },
  infoLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', marginTop: 3 },
  infoValue: { color: colors.ink, fontSize: 20, fontWeight: '900' },
  safe: { backgroundColor: colors.background, flex: 1 },
  summary: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
