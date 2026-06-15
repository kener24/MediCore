import { useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { ConsultationStatusBadge } from '@/features/doctor/components/ConsultationStatusBadge';
import { DoctorHeader } from '@/features/doctor/components/DoctorHeader';
import { PatientSummaryCard } from '@/features/doctor/components/PatientSummaryCard';
import { PriorityBadge } from '@/features/doctor/components/PriorityBadge';
import { VitalSignsCard } from '@/features/doctor/components/VitalSignsCard';
import {
  getDoctorPatientSummary,
  getVisitDetail,
  getVisitVitalSigns,
} from '@/features/doctor/services/doctorConsultationService';
import type { DoctorPatientSummary, DoctorVitalSigns } from '@/features/doctor/types/doctorConsultation.types';
import type { WaitingRoomPatient } from '@/features/doctor/types/doctorWaitingRoom.types';

export function DoctorPatientDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = (route.params ?? {}) as {
    item?: WaitingRoomPatient;
    patientId?: number;
    patient?: DoctorPatientSummary;
    visitId?: number;
  };
  const [patient, setPatient] = useState<DoctorPatientSummary | null>(params.patient ?? params.item?.patient ?? null);
  const [visit, setVisit] = useState<Record<string, unknown> | null>(params.item ? (params.item as unknown as Record<string, unknown>) : null);
  const [vitalSigns, setVitalSigns] = useState<DoctorVitalSigns | null>(params.item?.vital_signs ?? null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(params.visitId || params.patientId));

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [visitData, patientData, vitalsData] = await Promise.all([
        params.visitId ? getVisitDetail(params.visitId).catch(() => null) : Promise.resolve(null),
        params.patientId ? getDoctorPatientSummary(params.patientId).catch(() => null) : Promise.resolve(null),
        params.visitId ? getVisitVitalSigns(params.visitId).catch(() => null) : Promise.resolve(null),
      ]);
      if (visitData) setVisit(visitData);
      if (patientData) setPatient(patientData);
      if (vitalsData) setVitalSigns(vitalsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la información.');
    } finally {
      setLoading(false);
    }
  }, [params.patientId, params.visitId]);

  useEffect(() => {
    if (params.visitId || params.patientId) load();
  }, [load, params.patientId, params.visitId]);

  if (loading) return <LoadingState label="Cargando paciente..." />;
  if (error) return <ErrorState message={error} onRetry={load} title="No se pudo cargar el paciente" />;

  const reason = String(visit?.reason ?? visit?.motivo ?? params.item?.reason ?? params.item?.motivo ?? 'No indicado');
  const status = String(visit?.status ?? visit?.estado ?? params.item?.status ?? params.item?.estado ?? 'Pendiente');
  const priority = String(visit?.priority ?? visit?.prioridad ?? params.item?.priority ?? params.item?.prioridad ?? 'Normal');
  const visitId = params.visitId ?? params.item?.visit_id ?? params.item?.visita_id ?? params.item?.id;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <DoctorHeader title="Detalle del paciente" />
        <PatientSummaryCard patient={patient} />
        <AppCard style={styles.visitCard}>
          <Text style={styles.sectionTitle}>Visita actual</Text>
          <Text style={styles.reason}>{reason}</Text>
          <PriorityBadge value={priority} />
          <ConsultationStatusBadge status={status} />
        </AppCard>
        <VitalSignsCard vitalSigns={vitalSigns} />
        <AppButton label="Ver triaje completo" onPress={() => navigation.navigate('DoctorTriageDetail', { item: params.item, visit, vitalSigns })} variant="secondary" />
        <AppButton label="Iniciar consulta" onPress={() => navigation.navigate('DoctorConsultation', { patient, visitId })} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 22, paddingBottom: 34 },
  reason: { color: colors.ink, fontSize: 15, lineHeight: 21 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: '900' },
  visitCard: { gap: 10 },
});
