import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import {
  ConsultationCard,
  consultationId,
  patientId as resolvePatientId,
  visitId,
} from '@/features/doctor/components/ConsultationCard';
import { DoctorHeader } from '@/features/doctor/components/DoctorHeader';
import { getPatientConsultationHistory } from '@/features/doctor/services/doctorConsultationService';
import type { DoctorConsultation } from '@/features/doctor/types/doctorConsultation.types';

export function DoctorConsultationHistoryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = useMemo(() => (route.params ?? {}) as { patientId?: number }, [route.params]);
  const [items, setItems] = useState<DoctorConsultation[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (!params.patientId) {
      setLoading(false);
      setError('No se encontro el paciente.');
      return;
    }
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setItems(await getPatientConsultationHistory(params.patientId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el historial de consultas.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [params.patientId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function openDetail(item: DoctorConsultation) {
    navigation.navigate('DoctorConsultationDetail', {
      consultationId: consultationId(item),
      patientId: resolvePatientId(item) ?? params.patientId,
      visitId: visitId(item),
    });
  }

  if (loading) return <LoadingState label="Cargando historial clinico..." />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => load(true)} refreshing={refreshing} />}
        showsVerticalScrollIndicator={false}>
        <DoctorHeader title="Historial de consultas" />
        {error ? (
          <ErrorState message={error} onRetry={() => load()} title="No se pudo cargar el historial" />
        ) : items.length ? (
          items.map((item, index) => (
            <ConsultationCard
              item={item}
              key={consultationId(item) ?? index}
              onContinue={() => openDetail(item)}
              onOpen={() => openDetail(item)}
              onSummary={() => navigation.navigate('DoctorConsultationSummary', {
                consultationId: consultationId(item),
                patientId: resolvePatientId(item) ?? params.patientId,
                visitId: visitId(item),
              })}
            />
          ))
        ) : (
          <EmptyState
            description="Cuando el paciente tenga atenciones previas apareceran aqui."
            title="Este paciente aun no tiene consultas registradas."
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 22, paddingBottom: 128 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
});
