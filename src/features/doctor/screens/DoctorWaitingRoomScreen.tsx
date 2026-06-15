import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { DoctorHeader } from '@/features/doctor/components/DoctorHeader';
import { WaitingRoomPatientCard } from '@/features/doctor/components/WaitingRoomPatientCard';
import { startConsultation } from '@/features/doctor/services/doctorConsultationService';
import { getDoctorWaitingRoom } from '@/features/doctor/services/doctorWaitingRoomService';
import type { WaitingRoomPatient } from '@/features/doctor/types/doctorWaitingRoom.types';

export function DoctorWaitingRoomScreen() {
  const navigation = useNavigation<any>();
  const [patients, setPatients] = useState<WaitingRoomPatient[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  async function handleStart(item: WaitingRoomPatient) {
    const visitId = item.visit_id ?? item.visita_id ?? item.id;
    try {
      await startConsultation(visitId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Este módulo aún no está disponible.';
      if (!message.includes('404') && !message.includes('405')) {
        Alert.alert('Consulta', message);
      }
    } finally {
      navigation.navigate('DoctorConsultation', { patient: item.patient, visitId });
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
        {error ? (
          <ErrorState message={error} onRetry={() => load()} title="No se pudo cargar la sala" />
        ) : patients.length ? (
          patients.map((item) => (
            <WaitingRoomPatientCard
              item={item}
              key={item.id}
              onStartConsultation={() => handleStart(item)}
              onView={() => navigation.navigate('DoctorPatientDetail', { item, visitId: item.visit_id ?? item.visita_id ?? item.id })}
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
  content: { gap: 14, padding: 22, paddingBottom: 34 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
});
