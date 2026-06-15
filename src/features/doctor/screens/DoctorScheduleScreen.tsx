import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { toISODate } from '@/core/utils/dateUtils';
import { DoctorAppointmentCard } from '@/features/doctor/components/DoctorAppointmentCard';
import { DoctorHeader } from '@/features/doctor/components/DoctorHeader';
import { getDoctorAppointmentsByDate } from '@/features/doctor/services/doctorScheduleService';
import type { DoctorAppointment, DoctorScheduleFilter } from '@/features/doctor/types/doctorSchedule.types';

const filters: { label: string; value: DoctorScheduleFilter }[] = [
  { label: 'Todas', value: 'all' },
  { label: 'Programadas', value: 'scheduled' },
  { label: 'Confirmadas', value: 'confirmed' },
  { label: 'En espera', value: 'waiting' },
  { label: 'Completadas', value: 'completed' },
  { label: 'Canceladas', value: 'cancelled' },
];

export function DoctorScheduleScreen() {
  const navigation = useNavigation<any>();
  const [date, setDate] = useState(toISODate(new Date()));
  const [filter, setFilter] = useState<DoctorScheduleFilter>('all');
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const visibleAppointments = useMemo(() => {
    if (filter === 'all') return appointments;
    return appointments.filter((item) => {
      const status = (item.status ?? item.estado ?? '').toLowerCase();
      if (filter === 'scheduled') return ['scheduled', 'programada', 'pendiente'].includes(status);
      if (filter === 'confirmed') return ['confirmed', 'confirmada'].includes(status);
      if (filter === 'waiting') return ['checked_in', 'waiting', 'en_espera', 'in_progress'].includes(status);
      if (filter === 'completed') return ['completed', 'completada', 'atendida'].includes(status);
      return ['cancelled', 'cancelada', 'no_show'].includes(status);
    });
  }, [appointments, filter]);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setAppointments(await getDoctorAppointmentsByDate(date));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'El módulo de agenda aún no está disponible.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [date]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function viewAppointment(item: DoctorAppointment) {
    const visitId = item.visit_id ?? item.visita_id;
    if (!visitId) {
      Alert.alert('Agenda médica', 'Esta cita aún no tiene admisión registrada.');
    }
    navigation.navigate('DoctorPatientDetail', {
      appointment: item,
      appointmentId: item.appointment_id ?? item.id,
      patientId: item.patient_id,
      visitId,
    });
  }

  function attendAppointment(item: DoctorAppointment) {
    const visitId = item.visit_id ?? item.visita_id;
    if (!visitId) {
      Alert.alert('Agenda médica', 'Esta cita aún no tiene admisión registrada.');
      return;
    }
    navigation.navigate('DoctorConsultation', {
      appointmentId: item.appointment_id ?? item.id,
      patientId: item.patient_id,
      visitId,
    });
  }

  if (loading) return <LoadingState label="Cargando agenda..." />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => load(true)} refreshing={refreshing} />}
        showsVerticalScrollIndicator={false}>
        <DoctorHeader title="Agenda médica" />
        <View style={styles.controls}>
          <AppInput icon="calendar" keyboardType="numbers-and-punctuation" label="Fecha seleccionada" onChangeText={setDate} value={date} />
          <View style={styles.dateButtons}>
            <AppButton label="Día anterior" onPress={() => setDate(shiftDate(date, -1))} style={styles.dateButton} variant="secondary" />
            <AppButton label="Hoy" onPress={() => setDate(toISODate(new Date()))} style={styles.dateButton} variant="secondary" />
            <AppButton label="Día siguiente" onPress={() => setDate(shiftDate(date, 1))} style={styles.dateButton} variant="secondary" />
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filters}>
            {filters.map((item) => (
              <Pressable key={item.value} onPress={() => setFilter(item.value)} style={[styles.filter, filter === item.value && styles.filterActive]}>
                <Text style={[styles.filterText, filter === item.value && styles.filterTextActive]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        {error ? (
          <ErrorState message={error} onRetry={() => load()} title="No se pudo cargar la agenda" />
        ) : visibleAppointments.length ? (
          visibleAppointments.map((item) => (
            <DoctorAppointmentCard
              appointment={item}
              key={item.id}
              onAttend={() => attendAppointment(item)}
              onPress={() => viewAppointment(item)}
            />
          ))
        ) : (
          <EmptyState description="No tienes citas para este día." title="Agenda vacía" />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function shiftDate(value: string, days: number) {
  const date = value ? new Date(`${value}T00:00:00`) : new Date();
  if (Number.isNaN(date.getTime())) return toISODate(new Date());
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 22, paddingBottom: 34 },
  controls: { gap: 10 },
  dateButton: { flex: 1, height: 44 },
  dateButtons: { flexDirection: 'row', gap: 8 },
  filter: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  filterActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  filterTextActive: { color: colors.white },
  filters: { flexDirection: 'row', gap: 8 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
});
