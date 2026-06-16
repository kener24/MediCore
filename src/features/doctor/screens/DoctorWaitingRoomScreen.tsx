import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppCard } from '@/components/AppCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { DoctorHeader } from '@/features/doctor/components/DoctorHeader';
import { WaitingRoomPatientCard } from '@/features/doctor/components/WaitingRoomPatientCard';
import { getDoctorWaitingRoom, startConsultation } from '@/features/doctor/services/doctorWaitingRoomService';
import type { WaitingRoomPatient } from '@/features/doctor/types/doctorWaitingRoom.types';

type PriorityFilter = 'all' | 'normal' | 'priority' | 'urgent' | 'emergency';

const filters: { label: string; value: PriorityFilter }[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Prioridad normal', value: 'normal' },
  { label: 'Prioridad alta', value: 'priority' },
  { label: 'Urgente', value: 'urgent' },
  { label: 'Emergencia', value: 'emergency' },
];

export function DoctorWaitingRoomScreen() {
  const navigation = useNavigation<any>();
  const [patients, setPatients] = useState<WaitingRoomPatient[]>([]);
  const [filter, setFilter] = useState<PriorityFilter>('all');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const filteredPatients = useMemo(() => {
    if (filter === 'all') return patients;
    return patients.filter((item) => {
      const priority = (item.priority ?? item.prioridad ?? 'normal').toLowerCase();
      if (filter === 'priority') return ['priority', 'prioridad', 'alta', 'high'].includes(priority);
      if (filter === 'urgent') return ['urgent', 'urgente'].includes(priority);
      if (filter === 'emergency') return ['emergency', 'emergencia', 'critical'].includes(priority);
      return ['normal', 'baja', 'low'].includes(priority);
    });
  }, [filter, patients]);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setPatients(await getDoctorWaitingRoom());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la sala de espera.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function confirmStart(item: WaitingRoomPatient) {
    const visitId = item.visit_id ?? item.visita_id ?? item.id;
    if (!visitId) {
      Alert.alert('Consulta', 'No se puede iniciar consulta sin visita asociada.');
      return;
    }
    Alert.alert('Iniciar consulta', '¿Deseas iniciar la consulta de este paciente?', [
      { style: 'cancel', text: 'Cancelar' },
      { onPress: () => handleStart(item, visitId), text: 'Iniciar' },
    ]);
  }

  async function handleStart(item: WaitingRoomPatient, visitId: number) {
    try {
      const response = await startConsultation(visitId);
      const consultationId = typeof response === 'object' && response && 'id' in response ? Number(response.id) : undefined;
      Alert.alert('Consulta', 'Consulta iniciada correctamente.');
      navigation.navigate('DoctorConsultation', { consultationId, patient: item.patient, patientId: item.patient_id ?? item.paciente_id, visitId });
    } catch (err) {
      Alert.alert('Consulta', err instanceof Error ? err.message : 'No se pudo iniciar la consulta.');
    }
  }

  if (loading) return <LoadingState label="Cargando sala de espera..." />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => load(true)} refreshing={refreshing} />}
        showsVerticalScrollIndicator={false}>
        <DoctorHeader title="Sala de espera" />
        <AppCard style={styles.counterCard}>
          <Text style={styles.counterValue}>{patients.length}</Text>
          <Text style={styles.counterLabel}>pacientes esperando</Text>
        </AppCard>
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
          <ErrorState message={error} onRetry={() => load()} title="No se pudo cargar la sala" />
        ) : filteredPatients.length ? (
          filteredPatients.map((item) => (
            <WaitingRoomPatientCard
              item={item}
              key={item.id}
              onStartConsultation={() => confirmStart(item)}
              onView={() => navigation.navigate('DoctorPatientDetail', { item, patientId: item.patient_id ?? item.paciente_id, visitId: item.visit_id ?? item.visita_id ?? item.id })}
            />
          ))
        ) : (
          <EmptyState description="No hay pacientes listos para médico." title="No hay pacientes en sala de espera." />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 22, paddingBottom: 118 },
  counterCard: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  counterLabel: { color: colors.muted, fontSize: 13, fontWeight: '800' },
  counterValue: { color: colors.primary, fontSize: 26, fontWeight: '900' },
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
