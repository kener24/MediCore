import { useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { ClinicalConsumptionCard } from '@/features/doctor/components/ClinicalConsumptionCard';
import { ConsultationStatusBadge } from '@/features/doctor/components/ConsultationStatusBadge';
import { DoctorHeader } from '@/features/doctor/components/DoctorHeader';
import { MedicalOrderPreviewCard } from '@/features/doctor/components/MedicalOrderPreviewCard';
import { PrescriptionPreviewCard } from '@/features/doctor/components/PrescriptionPreviewCard';
import { completeConsultation, completeConsultationById } from '@/features/doctor/services/doctorConsultationService';
import { resolveRequiredConsultation } from '@/features/doctor/services/doctorConsultationContextService';
import { getConsultationConsumptions } from '@/features/doctor/services/doctorClinicalConsumptionService';
import { getConsultationMedicalOrders } from '@/features/doctor/services/doctorMedicalOrderService';
import { getConsultationPrescriptions } from '@/features/doctor/services/doctorPrescriptionService';
import { isConsultationFinalized } from '@/features/doctor/types/commonDoctor.types';
import type { DoctorConsultation } from '@/features/doctor/types/doctorConsultation.types';
import type { DoctorClinicalConsumption } from '@/features/doctor/types/doctorClinicalConsumption.types';
import type { DoctorMedicalOrder } from '@/features/doctor/types/doctorMedicalOrder.types';
import type { DoctorPrescription } from '@/features/doctor/types/doctorPrescription.types';

export function DoctorConsultationSummaryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = useMemo(() => (route.params ?? {}) as { consultationId?: number; patientId?: number; visitId?: number }, [route.params]);
  const [consultation, setConsultation] = useState<DoctorConsultation | null>(null);
  const [consultationId, setConsultationId] = useState<number | undefined>(params.consultationId);
  const [visitId, setVisitId] = useState<number | undefined>(params.visitId);
  const [prescriptions, setPrescriptions] = useState<DoctorPrescription[]>([]);
  const [orders, setOrders] = useState<DoctorMedicalOrder[]>([]);
  const [consumptions, setConsumptions] = useState<DoctorClinicalConsumption[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const context = await resolveRequiredConsultation(params);
      setConsultation(context.consultation);
      setConsultationId(context.consultationId);
      setVisitId(context.visitId);
      if (context.consultationId) {
        const [nextPrescriptions, nextOrders, nextConsumptions] = await Promise.all([
          getConsultationPrescriptions(context.consultationId).catch(() => []),
          getConsultationMedicalOrders(context.consultationId).catch(() => []),
          getConsultationConsumptions(context.consultationId).catch(() => []),
        ]);
        setPrescriptions(nextPrescriptions);
        setOrders(nextOrders);
        setConsumptions(nextConsumptions);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el resumen de consulta.');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    load();
  }, [load]);

  function confirmFinish() {
    if (isConsultationFinalized(consultation?.status)) return Alert.alert('Finalizar consulta', 'Esta consulta ya fue finalizada.');
    if (!consultationId) return Alert.alert('Finalizar consulta', 'No se encontró la consulta.');
    if (!visitId) return Alert.alert('Finalizar consulta', 'No se encontró la visita.');
    if (!consultation?.chief_complaint?.trim()) return Alert.alert('Finalizar consulta', 'Escribe el motivo principal antes de finalizar.');
    if (!consultation.diagnosis_text?.trim() && !consultation.assessment?.trim() && !consultation.preliminary_diagnosis?.trim() && !consultation.clinical_assessment?.trim()) {
      return Alert.alert('Finalizar consulta', 'Agrega un diagnóstico o evaluación clínica antes de finalizar.');
    }
    Alert.alert('Finalizar consulta', '¿Deseas finalizar esta consulta? Después de finalizar no podrás editarla desde la app.', [
      { style: 'cancel', text: 'Cancelar' },
      { onPress: finish, text: 'Finalizar' },
    ]);
  }

  async function finish() {
    if (!consultationId || !visitId) return;
    setFinishing(true);
    try {
      await completeConsultation(visitId, { status: 'completed' }).catch(() => completeConsultationById(consultationId, { status: 'completed' }));
      Alert.alert('Consulta finalizada', 'Consulta finalizada correctamente.');
      navigation.getParent()?.navigate('DoctorWaitingRoomTab');
    } catch (err) {
      Alert.alert('Finalizar consulta', err instanceof Error ? err.message : 'Ocurrió un error en el servidor.');
    } finally {
      setFinishing(false);
    }
  }

  if (loading) return <LoadingState label="Cargando resumen de consulta..." />;
  if (error) return <ErrorState message={error} onRetry={load} title="No se pudo cargar el resumen" />;
  const completed = isConsultationFinalized(consultation?.status);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <DoctorHeader title="Resumen de consulta" />
        <AppCard style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.title}>Consulta</Text>
            <ConsultationStatusBadge status={consultation?.status} />
          </View>
          <Info label="Motivo principal" value={consultation?.chief_complaint} />
          <Info label="Diagnóstico" value={consultation?.diagnosis_text ?? consultation?.preliminary_diagnosis} />
          <Info label="Plan" value={consultation?.plan ?? consultation?.treatment_plan} />
          <Info label="Recomendaciones" value={consultation?.recommendations} />
        </AppCard>
        <PrescriptionPreviewCard
          items={prescriptions}
          onPressItem={(item) => navigation.navigate('DoctorPrescriptionDetail', { prescription: item, prescriptionId: item.id })}
        />
        <MedicalOrderPreviewCard
          items={orders}
          onPressItem={(item) => navigation.navigate('DoctorMedicalOrderDetail', { order: item, orderId: item.id })}
        />
        <ClinicalConsumptionCard items={consumptions} />
        <AppButton disabled={completed} label="Agregar receta" onPress={() => navigation.navigate('DoctorPrescription', { consultationId, patientId: params.patientId, visitId })} variant="secondary" />
        <AppButton disabled={completed} label="Agregar orden médica" onPress={() => navigation.navigate('DoctorMedicalOrder', { consultationId, patientId: params.patientId, visitId })} variant="secondary" />
        <AppButton disabled={completed} label="Agregar consumo clínico" onPress={() => navigation.navigate('DoctorClinicalConsumption', { consultationId, patientId: params.patientId, visitId })} variant="secondary" />
        <AppButton label="Volver a editar consulta" onPress={() => navigation.goBack()} variant="secondary" />
        <AppButton disabled={completed} label={completed ? 'Consulta finalizada' : 'Finalizar consulta'} loading={finishing} onPress={confirmFinish} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.info}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || 'No indicado'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  content: { gap: 14, padding: 22, paddingBottom: 128 },
  info: { gap: 3 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  title: { color: colors.ink, fontSize: 17, fontWeight: '900' },
  value: { color: colors.ink, fontSize: 14, lineHeight: 20 },
});
