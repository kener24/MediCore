import { useFocusEffect, useNavigation, type NavigationProp, type ParamListBase } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { AppointmentCard } from '@/features/patient/components/AppointmentCard';
import { PatientHeader } from '@/features/patient/components/PatientHeader';
import { getPatientAppointments } from '@/features/patient/services/patientAppointmentsService';
import type { PatientAppointment, PatientAppointmentFilter } from '@/features/patient/types/patientAppointments.types';
import { colors } from '@/core/theme/colors';

const filters: { label: string; value: PatientAppointmentFilter }[] = [
  { label: 'Proximas', value: 'upcoming' },
  { label: 'Historial', value: 'history' },
  { label: 'Todas', value: 'all' },
];

export function PatientAppointmentsScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [filter, setFilter] = useState<PatientAppointmentFilter>('upcoming');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await getPatientAppointments();
      setAppointments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const visibleAppointments = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return appointments.filter((appointment) => {
      if (filter === 'all') return true;
      const date = appointment.scheduled_date ? new Date(appointment.scheduled_date) : null;
      const isUpcoming = date ? date >= today : appointment.status === 'pendiente' || appointment.status === 'confirmada';
      return filter === 'upcoming' ? isUpcoming : !isUpcoming;
    });
  }, [appointments, filter]);

  if (loading) return <LoadingState label="Cargando citas..." />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => load(true)} refreshing={refreshing} />}
        showsVerticalScrollIndicator={false}>
        <PatientHeader subtitle="Consulta y administra tus citas autorizadas." title="Mis citas" />

        <View style={styles.filters}>
          {filters.map((item) => (
            <AppButton
              key={item.value}
              label={item.label}
              onPress={() => setFilter(item.value)}
              style={styles.filterButton}
              variant={filter === item.value ? 'primary' : 'secondary'}
            />
          ))}
        </View>

        <AppButton
          label="Solicitar cita"
          onPress={() => navigation.navigate('RequestAppointment' as never)}
          variant="secondary"
        />

        {error ? (
          <ErrorState message={error} onRetry={() => load()} title="No se pudieron cargar las citas" />
        ) : visibleAppointments.length ? (
          <View style={styles.list}>
            {visibleAppointments.map((appointment) => (
              <AppointmentCard
                appointment={appointment}
                key={appointment.id}
                onPress={() =>
                  navigation.navigate('PatientAppointmentDetail', { id: appointment.id })
                }
              />
            ))}
          </View>
        ) : (
          <EmptyState
            description="Cuando tengas citas registradas apareceran en esta seccion."
            title="No hay citas disponibles"
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    padding: 22,
    paddingBottom: 34,
  },
  filterButton: {
    flex: 1,
    height: 44,
    paddingHorizontal: 8,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
  },
  list: {
    gap: 12,
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
