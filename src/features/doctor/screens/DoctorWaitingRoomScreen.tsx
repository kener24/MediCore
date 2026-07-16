import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { toPositiveId } from '@/core/utils/idUtils';
import { DoctorHeader } from '@/features/doctor/components/DoctorHeader';
import { WaitingRoomPatientCard } from '@/features/doctor/components/WaitingRoomPatientCard';
import { getDoctorWaitingRoom, startConsultation } from '@/features/doctor/services/doctorWaitingRoomService';
import type { WaitingRoomPatient } from '@/features/doctor/types/doctorWaitingRoom.types';

type PriorityFilter = 'all' | 'normal' | 'priority' | 'urgent' | 'emergency';

const filters: { label: string; value: PriorityFilter }[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Normal', value: 'normal' },
  { label: 'Alta', value: 'priority' },
  { label: 'Urgente', value: 'urgent' },
  { label: 'Emergencia', value: 'emergency' },
];

export function DoctorWaitingRoomScreen() {
  const navigation = useNavigation<any>();
  const [patients, setPatients] = useState<WaitingRoomPatient[]>([]);
  const [filter, setFilter] = useState<PriorityFilter>('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [startingVisitId, setStartingVisitId] = useState<number | null>(null);

  const filteredPatients = useMemo(() => {
    const term = search.trim().toLowerCase();
    return patients.filter((item) => {
      const priority = (item.priority ?? item.prioridad ?? 'normal').toLowerCase();
      const name = (item.patient_name ?? item.paciente_nombre ?? item.patient?.full_name ?? item.patient?.nombre_completo ?? '').toLowerCase();
      const reason = (item.reason ?? item.motivo ?? '').toLowerCase();
      const code = String(item.patient?.patient_code ?? item.patient_id ?? item.paciente_id ?? '').toLowerCase();
      const matchesSearch = !term || name.includes(term) || reason.includes(term) || code.includes(term);

      if (!matchesSearch) return false;
      if (filter === 'all') return true;
      if (filter === 'priority') return ['priority', 'prioridad', 'alta', 'high'].includes(priority);
      if (filter === 'urgent') return ['urgent', 'urgente'].includes(priority);
      if (filter === 'emergency') return ['emergency', 'emergencia', 'critical'].includes(priority);
      return ['normal', 'baja', 'low'].includes(priority);
    }).sort((a, b) => patientWeight(b) - patientWeight(a));
  }, [filter, patients, search]);

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
    const visitId = toPositiveId(item.visit_id ?? item.visita_id ?? item.id);
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
    if (startingVisitId) return;
    setStartingVisitId(visitId);
    try {
      const response = await startConsultation(visitId);
      const consultationId = response.consultation_id ?? response.id;
      navigation.navigate('DoctorConsultation', { consultationId, patient: item.patient, patientId: toPositiveId(item.patient_id ?? item.paciente_id), visitId });
    } catch (err) {
      Alert.alert('Consulta', err instanceof Error ? err.message : 'No se pudo iniciar la consulta.');
    } finally {
      setStartingVisitId(null);
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
          <View>
            <Text style={styles.counterValue}>{patients.length}</Text>
            <Text style={styles.counterLabel}>pacientes esperando</Text>
          </View>
          <View>
            <Text style={styles.counterValue}>{filteredPatients.length}</Text>
            <Text style={styles.counterLabel}>en vista actual</Text>
          </View>
        </AppCard>
        <AppInput
          autoCapitalize="none"
          icon="magnify"
          label="Buscar paciente"
          onChangeText={setSearch}
          placeholder="Nombre, código o motivo"
          value={search}
        />
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
          filteredPatients.map((item) => {
            const visitId = toPositiveId(item.visit_id ?? item.visita_id ?? item.id);
            return (
              <WaitingRoomPatientCard
                item={item}
                key={item.id}
                loading={startingVisitId === visitId}
                onStartConsultation={() => confirmStart(item)}
                onView={() => navigation.navigate('DoctorPatientDetail', { item, patientId: toPositiveId(item.patient_id ?? item.paciente_id), visitId })}
              />
            );
          })
        ) : (
          <EmptyState
            description={search.trim() || filter !== 'all' ? 'Ajusta la búsqueda o cambia el filtro de prioridad para ver más pacientes.' : 'Cuando enfermería complete el triaje, los pacientes aparecerán aquí ordenados por prioridad clínica.'}
            icon="account-clock-outline"
            title={search.trim() || filter !== 'all' ? 'Sin pacientes para este filtro' : 'Sala de espera despejada'}
            tone={search.trim() || filter !== 'all' ? 'warning' : 'success'}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 22, paddingBottom: 118 },
  counterCard: { alignItems: 'center', flexDirection: 'row', gap: 24, justifyContent: 'space-between' },
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

function patientWeight(item: WaitingRoomPatient) {
  const priority = (item.priority ?? item.prioridad ?? 'normal').toLowerCase();
  const priorityScore = ['emergency', 'emergencia', 'critical'].includes(priority)
    ? 400
    : ['urgent', 'urgente'].includes(priority)
      ? 300
      : ['priority', 'prioridad', 'alta', 'high'].includes(priority)
        ? 200
        : 100;
  const waitingMinutes = Number(item.waiting_time_minutes ?? 0);
  return priorityScore + Math.min(waitingMinutes, 120);
}
