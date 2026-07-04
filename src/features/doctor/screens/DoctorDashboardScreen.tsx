import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { DoctorAppointmentCard } from '@/features/doctor/components/DoctorAppointmentCard';
import { DoctorHeader } from '@/features/doctor/components/DoctorHeader';
import { DoctorQuickActions } from '@/features/doctor/components/DoctorQuickActions';
import { DoctorStatsGrid } from '@/features/doctor/components/DoctorStatsGrid';
import { WaitingRoomPatientCard } from '@/features/doctor/components/WaitingRoomPatientCard';
import { getDoctorDashboard } from '@/features/doctor/services/doctorDashboardService';
import { startConsultation } from '@/features/doctor/services/doctorWaitingRoomService';
import type { NormalizedDoctorDashboard } from '@/features/doctor/types/doctorDashboard.types';
import type { WaitingRoomPatient } from '@/features/doctor/types/doctorWaitingRoom.types';

export function DoctorDashboardScreen() {
  const navigation = useNavigation<any>();
  const [dashboard, setDashboard] = useState<NormalizedDoctorDashboard | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [startingVisitId, setStartingVisitId] = useState<number | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setDashboard(await getDoctorDashboard());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la información.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function go(target: string) {
    if (target === 'schedule') navigation.getParent()?.navigate('DoctorScheduleTab');
    if (target === 'waitingRoom') navigation.getParent()?.navigate('DoctorWaitingRoomTab');
    if (target === 'consultations') navigation.getParent()?.navigate('DoctorConsultationsTab');
    if (target === 'notifications') navigation.navigate('DoctorNotifications');
    if (target === 'profile') navigation.getParent()?.navigate('DoctorProfileTab');
  }

  function confirmStart(item: WaitingRoomPatient) {
    const visitId = item.visit_id ?? item.visita_id ?? item.id;
    if (!visitId) {
      Alert.alert('Consulta', 'No se puede iniciar consulta sin visita asociada.');
      return;
    }
    Alert.alert('Iniciar consulta', 'Deseas iniciar la consulta de este paciente?', [
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
      navigation.navigate('DoctorConsultation', {
        consultationId,
        patient: item.patient,
        patientId: item.patient_id ?? item.paciente_id,
        visitId,
      });
    } catch (err) {
      Alert.alert('Consulta', err instanceof Error ? err.message : 'No se pudo iniciar la consulta.');
    } finally {
      setStartingVisitId(null);
    }
  }

  if (loading) return <LoadingState label="Cargando panel médico..." />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => load(true)} refreshing={refreshing} />}
        showsVerticalScrollIndicator={false}>
        {error ? (
          <ErrorState message={error} onRetry={() => load()} title="No se pudo cargar el panel médico" />
        ) : dashboard ? (
          <>
            <DoctorHeader
              clinicName={dashboard.clinicName}
              doctorName={dashboard.doctorName}
              onNotificationsPress={() => navigation.navigate('DoctorNotifications')}
              specialty={dashboard.specialty}
              unreadCount={dashboard.stats.unreadNotifications}
              title="Bienvenido"
            />
            <DoctorStatsGrid stats={dashboard.stats} />
            <DoctorQuickActions onNavigate={go} />
            <View style={styles.section}>
              {dashboard.waitingRoom.slice(0, 2).map((item) => {
                const visitId = item.visit_id ?? item.visita_id ?? item.id;
                return (
                  <WaitingRoomPatientCard
                    item={item}
                    key={item.id}
                    loading={startingVisitId === visitId}
                    onStartConsultation={() => confirmStart(item)}
                    onView={() => navigation.navigate('DoctorPatientDetail', { item, visitId })}
                  />
                );
              })}
              {!dashboard.waitingRoom.length ? <EmptyState title="No hay pacientes en sala de espera." /> : null}
            </View>
            <View style={styles.section}>
              {dashboard.todayAppointments.slice(0, 3).map((item) => (
                <DoctorAppointmentCard
                  appointment={item}
                  key={item.id}
                  onPress={() =>
                    navigation.navigate('DoctorPatientDetail', {
                      appointment: item,
                      visitId: item.visit_id ?? item.visita_id,
                    })
                  }
                />
              ))}
            </View>
          </>
        ) : (
          <EmptyState title="No hay datos disponibles." />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16, padding: 22, paddingBottom: 118 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  section: { gap: 10 },
});
