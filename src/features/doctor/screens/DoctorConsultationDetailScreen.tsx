import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { ConsultationStatusBadge } from '@/features/doctor/components/ConsultationStatusBadge';
import { DoctorHeader } from '@/features/doctor/components/DoctorHeader';
import {
  completeConsultation,
  completeConsultationById,
  getConsultationDetail,
  getConsultationRelatedData,
} from '@/features/doctor/services/doctorConsultationService';
import { isConsultationFinalized } from '@/features/doctor/types/commonDoctor.types';
import type { ConsultationFormValues, DoctorConsultation } from '@/features/doctor/types/doctorConsultation.types';
import { validateConsultationFinish } from '@/features/doctor/utils/clinicalValidation';

type Params = { consultationId?: number; patientId?: number; visitId?: number };

export function DoctorConsultationDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = useMemo(() => (route.params ?? {}) as Params, [route.params]);
  const [consultation, setConsultation] = useState<DoctorConsultation | null>(null);
  const [related, setRelated] = useState<{ consumptions: unknown[]; medical_orders: unknown[]; prescriptions: unknown[] }>({
    consumptions: [],
    medical_orders: [],
    prescriptions: [],
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);

  const consultationId = params.consultationId ?? consultation?.id ?? consultation?.consultation_id;
  const patientId = params.patientId ?? consultation?.patient_id ?? asPatientRecord(consultation?.patient)?.id;
  const visitId = params.visitId ?? consultation?.visit_id ?? consultation?.patient_visit ?? undefined;
  const completed = isConsultationFinalized(consultation?.status);
  const form = toFormValues(consultation);

  const load = useCallback(async () => {
    if (!params.consultationId) {
      setLoading(false);
      setError('No se encontró la consulta médica.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const detail = await getConsultationDetail(params.consultationId);
      setConsultation(detail);
      const id = detail.id ?? detail.consultation_id ?? params.consultationId;
      setRelated(await getConsultationRelatedData(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el detalle de consulta.');
    } finally {
      setLoading(false);
    }
  }, [params.consultationId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function confirmFinish() {
    if (completed) return Alert.alert('Consulta médica', 'Esta consulta ya fue finalizada.');
    if (!consultationId || !visitId) return Alert.alert('Consulta médica', 'No se encontró la consulta o visita asociada.');
    const validation = validateConsultationFinish(form, consultation);
    if (validation) return Alert.alert('Finalizar consulta', validation);
    Alert.alert('Finalizar consulta', 'Después de finalizar no podrás editarla desde la app. ¿Deseas continuar?', [
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
      await load();
    } catch (err) {
      Alert.alert('Consulta médica', err instanceof Error ? err.message : 'No se pudo finalizar la consulta.');
    } finally {
      setFinishing(false);
    }
  }

  if (loading) return <LoadingState label="Cargando detalle de consulta..." />;
  if (error) return <ErrorState message={error} onRetry={load} title="No se pudo cargar la consulta" />;
  if (!consultation) return <EmptyState title="Consulta no encontrada" />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <DoctorHeader title="Detalle de consulta" />
        <AppCard style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.title}>{patientName(consultation)}</Text>
            <ConsultationStatusBadge status={consultation.status} />
          </View>
          {completed ? <Text style={styles.readOnly}>Esta consulta ya fue finalizada.</Text> : null}
          <Info label="Motivo principal" value={consultation.chief_complaint || consultation.reason} />
          <Info label="Historia de enfermedad actual" value={consultation.history_present_illness || consultation.symptoms} />
          <Info label="Examen físico" value={consultation.physical_examination || consultation.physical_exam} />
          <Info label="Evaluación clínica" value={consultation.assessment || consultation.clinical_assessment} />
          <Info label="Diagnóstico" value={consultation.diagnosis_text || consultation.preliminary_diagnosis} />
          <Info label="Plan de tratamiento" value={consultation.plan || consultation.treatment_plan} />
          <Info label="Recomendaciones" value={consultation.recommendations} />
          <Info label="Notas" value={consultation.notes || consultation.private_notes} />
        </AppCard>

        <RelatedSection title="Signos vitales y triaje" count={consultation.vital_signs || consultation.triage ? 1 : 0} />
        <RelatedSection title="Recetas medicas" count={related.prescriptions.length} />
        <RelatedSection title="Órdenes médicas" count={related.medical_orders.length} />
        <RelatedSection title="Consumos clínicos" count={related.consumptions.length} />

        <AppButton disabled={completed} label="Continuar edicion" onPress={() => navigation.navigate('DoctorConsultation', { consultationId, patientId, visitId })} />
        <AppButton label="Ver resumen" onPress={() => navigation.navigate('DoctorConsultationSummary', { consultationId, patientId, visitId })} variant="secondary" />
        <AppButton
          label="Historial del paciente"
          onPress={() => patientId ? navigation.navigate('DoctorConsultationHistory', { patientId }) : Alert.alert('Historial', 'No se encontró el paciente.')}
          variant="secondary"
        />
        <AppButton disabled={completed} label="Agregar receta" onPress={() => navigation.navigate('DoctorPrescription', { consultationId, patientId, visitId })} variant="secondary" />
        <AppButton disabled={completed} label="Agregar orden médica" onPress={() => navigation.navigate('DoctorMedicalOrder', { consultationId, patientId, visitId })} variant="secondary" />
        <AppButton disabled={completed} label="Agregar consumo clínico" onPress={() => navigation.navigate('DoctorClinicalConsumption', { consultationId, patientId, visitId })} variant="secondary" />
        <AppButton disabled={completed} label={completed ? 'Consulta finalizada' : 'Finalizar consulta'} loading={finishing} onPress={confirmFinish} />
        <AppButton label="Volver" onPress={() => navigation.goBack()} variant="secondary" />
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

function RelatedSection({ count, title }: { count: number; title: string }) {
  return (
    <AppCard style={styles.related}>
      <Text style={styles.relatedTitle}>{title}</Text>
      <Text style={styles.relatedText}>{count ? `${count} registro(s)` : 'No disponible por el momento.'}</Text>
    </AppCard>
  );
}

function patientName(consultation: DoctorConsultation) {
  const patient = asPatientRecord(consultation.patient);
  if (patient) {
    return patient.full_name || patient.nombre_completo || 'Paciente';
  }
  return consultation.patient_name || consultation.patient_nombre || 'Paciente';
}

function asPatientRecord(value: DoctorConsultation['patient']) {
  return value && typeof value === 'object' ? value : null;
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
  card: { gap: 12 },
  content: { gap: 14, padding: 22, paddingBottom: 128 },
  info: { gap: 4 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  readOnly: { color: colors.success, fontSize: 13, fontWeight: '900' },
  related: { gap: 4 },
  relatedText: { color: colors.muted, fontSize: 13 },
  relatedTitle: { color: colors.ink, fontSize: 15, fontWeight: '900' },
  row: { alignItems: 'flex-start', flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  title: { color: colors.ink, flex: 1, fontSize: 18, fontWeight: '900' },
  value: { color: colors.ink, fontSize: 14, lineHeight: 20 },
});
