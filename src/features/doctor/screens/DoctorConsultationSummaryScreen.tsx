import { useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { toPositiveId } from '@/core/utils/idUtils';
import { ClinicalConsumptionCard } from '@/features/doctor/components/ClinicalConsumptionCard';
import { ConsultationStatusBadge } from '@/features/doctor/components/ConsultationStatusBadge';
import { DoctorHeader } from '@/features/doctor/components/DoctorHeader';
import { MedicalOrderPreviewCard } from '@/features/doctor/components/MedicalOrderPreviewCard';
import { PrescriptionPreviewCard } from '@/features/doctor/components/PrescriptionPreviewCard';
import { getConsultationConsumptions } from '@/features/doctor/services/doctorClinicalConsumptionService';
import { completeConsultation, completeConsultationById } from '@/features/doctor/services/doctorConsultationService';
import { resolveRequiredConsultation } from '@/features/doctor/services/doctorConsultationContextService';
import { getConsultationMedicalOrders } from '@/features/doctor/services/doctorMedicalOrderService';
import { getConsultationPrescriptions } from '@/features/doctor/services/doctorPrescriptionService';
import { isConsultationFinalized } from '@/features/doctor/types/commonDoctor.types';
import type { DoctorClinicalConsumption } from '@/features/doctor/types/doctorClinicalConsumption.types';
import type { ConsultationFormValues, DoctorConsultation } from '@/features/doctor/types/doctorConsultation.types';
import type { DoctorMedicalOrder } from '@/features/doctor/types/doctorMedicalOrder.types';
import type { DoctorPrescription } from '@/features/doctor/types/doctorPrescription.types';
import { consultationProgress, validateConsultationFinish } from '@/features/doctor/utils/clinicalValidation';

export function DoctorConsultationSummaryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = useMemo(() => (route.params ?? {}) as { consultationId?: number | string; patientId?: number | string; visitId?: number | string }, [route.params]);
  const [consultation, setConsultation] = useState<DoctorConsultation | null>(null);
  const [consultationId, setConsultationId] = useState<number | undefined>(toPositiveId(params.consultationId));
  const [visitId, setVisitId] = useState<number | undefined>(toPositiveId(params.visitId));
  const [prescriptions, setPrescriptions] = useState<DoctorPrescription[]>([]);
  const [orders, setOrders] = useState<DoctorMedicalOrder[]>([]);
  const [consumptions, setConsumptions] = useState<DoctorClinicalConsumption[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);

  const form = useMemo(() => toFormValues(consultation), [consultation]);
  const progress = consultationProgress(form);
  const completed = isConsultationFinalized(consultation?.status);
  const hasClinicalActions = prescriptions.length > 0 || orders.length > 0 || consumptions.length > 0;

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
    if (finishing) return;
    if (completed) return Alert.alert('Finalizar consulta', 'Esta consulta ya fue finalizada.');
    if (!consultationId) return Alert.alert('Finalizar consulta', 'No se encontró la consulta.');
    if (!visitId) return Alert.alert('Finalizar consulta', 'No se encontró la visita.');
    const validation = validateConsultationFinish(form, consultation);
    if (validation) return Alert.alert('Finalizar consulta', validation);
    const warning = hasClinicalActions
      ? 'Después de finalizar no podrás editarla desde la app. ¿Deseas continuar?'
      : 'No hay receta, orden médica ni consumo clínico asociado. Si no aplica, puedes finalizar. Después no podrás editarla desde la app. ¿Deseas continuar?';
    Alert.alert('Finalizar consulta', warning, [
      { style: 'cancel', text: 'Cancelar' },
      { onPress: finish, text: 'Finalizar' },
    ]);
  }

  async function finish() {
    if (finishing || !consultationId || !visitId) return;
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <DoctorHeader title="Resumen de consulta" />
        <AppCard style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.title}>Consulta</Text>
            <ConsultationStatusBadge status={consultation?.status} />
          </View>
          <Text style={styles.progress}>Checklist clínico: {progress.completed}/{progress.required} ({progress.percent}%)</Text>
          <Info label="Motivo principal" value={consultation?.chief_complaint} />
          <Info label="Diagnóstico" value={consultation?.diagnosis_text ?? consultation?.preliminary_diagnosis} />
          <Info label="Plan" value={consultation?.plan ?? consultation?.treatment_plan} />
          <Info label="Recomendaciones" value={consultation?.recommendations} />
        </AppCard>
        {!completed && !hasClinicalActions ? (
          <AppCard style={styles.warningCard}>
            <Text style={styles.warningTitle}>Sin indicaciones adjuntas</Text>
            <Text style={styles.warningText}>Antes de finalizar confirma si el paciente necesita receta, orden médica o consumo clínico. Si no aplica, puedes cerrar la consulta.</Text>
          </AppCard>
        ) : null}
        <PrescriptionPreviewCard
          items={prescriptions}
          onPressItem={(item) => navigation.navigate('DoctorPrescriptionDetail', { prescription: item, prescriptionId: item.id })}
        />
        <MedicalOrderPreviewCard
          items={orders}
          onPressItem={(item) => navigation.navigate('DoctorMedicalOrderDetail', { order: item, orderId: item.id })}
        />
        <ClinicalConsumptionCard items={consumptions} />
        <AppButton disabled={completed || finishing} label={completed ? 'Consulta finalizada' : 'Agregar receta'} onPress={() => navigation.navigate('DoctorPrescription', { consultationId, patientId: toPositiveId(params.patientId), visitId })} variant="secondary" />
        <AppButton disabled={completed || finishing} label={completed ? 'Consulta finalizada' : 'Agregar orden médica'} onPress={() => navigation.navigate('DoctorMedicalOrder', { consultationId, patientId: toPositiveId(params.patientId), visitId })} variant="secondary" />
        <AppButton disabled={completed || finishing} label={completed ? 'Consulta finalizada' : 'Agregar consumo clínico'} onPress={() => navigation.navigate('DoctorClinicalConsumption', { consultationId, patientId: toPositiveId(params.patientId), visitId })} variant="secondary" />
        <AppButton label="Volver a consulta" onPress={() => navigation.goBack()} variant="secondary" />
        <AppButton disabled={completed || finishing} label={completed ? 'Consulta finalizada' : 'Finalizar consulta'} loading={finishing} onPress={confirmFinish} />
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

function toFormValues(consultation?: DoctorConsultation | null): ConsultationFormValues {
  return {
    assessment: consultation?.assessment ?? consultation?.clinical_assessment ?? '',
    chief_complaint: consultation?.chief_complaint ?? '',
    diagnosis_text: consultation?.diagnosis_text ?? consultation?.preliminary_diagnosis ?? '',
    history_present_illness: consultation?.history_present_illness ?? consultation?.symptoms ?? '',
    notes: consultation?.notes ?? consultation?.private_notes ?? '',
    physical_examination: consultation?.physical_examination ?? consultation?.physical_exam ?? '',
    plan: consultation?.plan ?? consultation?.treatment_plan ?? '',
    recommendations: consultation?.recommendations ?? '',
  };
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  content: { gap: 14, padding: 22, paddingBottom: 128 },
  info: { gap: 3 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  progress: { color: colors.primaryDark, fontSize: 13, fontWeight: '900' },
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  title: { color: colors.ink, fontSize: 17, fontWeight: '900' },
  value: { color: colors.ink, fontSize: 14, lineHeight: 20 },
  warningCard: { backgroundColor: '#fffbeb', borderColor: '#fde68a', gap: 6 },
  warningText: { color: colors.warning, fontSize: 13, fontWeight: '700', lineHeight: 19 },
  warningTitle: { color: colors.warning, fontSize: 15, fontWeight: '900' },
});
