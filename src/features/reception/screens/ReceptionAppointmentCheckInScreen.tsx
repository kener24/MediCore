import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { AppointmentCheckInCard } from '@/features/reception/components/AppointmentCheckInCard';
import { checkInAppointment, getTodayAppointments } from '@/features/reception/services/receptionAppointmentService';
import type { ReceptionAppointment } from '@/features/reception/types/receptionAppointment.types';

const filters = [['all', 'Todas'], ['scheduled', 'Pendientes'], ['confirmed', 'Confirmadas']] as const;

export function ReceptionAppointmentCheckInScreen() {
  const navigation = useNavigation<any>();
  const [appointments, setAppointments] = useState<ReceptionAppointment[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
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
  const visible = useMemo(() => filter === 'all' ? appointments : appointments.filter((item) => item.status === filter), [appointments, filter]);

  async function checkIn(item: ReceptionAppointment) {
    if (!item.id) return;
    try {
      const visit = await checkInAppointment(item.id);
      Alert.alert('Check-in', 'Check-in realizado correctamente.', [{ text: 'Ver visita', onPress: () => navigation.navigate('ReceptionVisitDetail', { visitId: visit.id }) }]);
    } catch (err) {
      Alert.alert('Check-in', err instanceof Error ? err.message : 'No se pudo realizar el check-in.');
    }
  }

  if (loading) return <LoadingState label="Cargando citas..." />;
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
        <AppHeader icon="calendar-check-outline" subtitle="Citas del día listas para registrar llegada." title="Check-in de cita" />
        <View style={styles.filters}>{filters.map(([value, label]) => <Text key={value} onPress={() => setFilter(value)} style={[styles.filter, filter === value && styles.filterActive]}>{label}</Text>)}</View>
        {error ? <ErrorState message={error} onRetry={() => void load()} title="No se pudo cargar" /> : null}
        {!error && visible.length === 0 ? <EmptyState description="No hay citas para este filtro." title="Sin citas de hoy" /> : null}
        {visible.map((appointment) => <AppointmentCheckInCard appointment={appointment} key={appointment.id} onCheckIn={() => void checkIn(appointment)} />)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 18, paddingBottom: 120 },
  filter: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: 999, borderWidth: 1, color: colors.muted, fontSize: 12, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 9 },
  filterActive: { backgroundColor: colors.primary, borderColor: colors.primary, color: colors.white },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  safe: { backgroundColor: colors.background, flex: 1 },
});
