import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { formatDateTime } from '@/core/utils/dateUtils';
import { toPositiveId } from '@/core/utils/idUtils';
import {
  CurrentBedCard,
  HospitalizationEventCard,
  InpatientPatientCard,
  InpatientVitalSignsCard,
  NursingNoteCard,
  resolvePatientName,
} from '@/features/nurse/hospitalization/components/HospitalizationCards';
import { HospitalizationStatusBadge } from '@/features/nurse/hospitalization/components/HospitalizationBadges';
import { acknowledgeMedicalInstruction, getHospitalizationDetail, getMedicalInstructions, updateMedicalInstruction } from '@/features/nurse/hospitalization/services/nurseHospitalizationService';
import type { MedicalInstruction, NurseHospitalizationDetail } from '@/features/nurse/hospitalization/types/nurseHospitalization.types';

export function NurseHospitalizationDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const hospitalizationId = toPositiveId(route.params?.hospitalizationId);
  const [detail, setDetail] = useState<NurseHospitalizationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [instructions, setInstructions] = useState<MedicalInstruction[]>([]);
  const [updatingInstruction, setUpdatingInstruction] = useState<number | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (!hospitalizationId) {
      setError('No se encontró el internamiento.');
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [hospitalization, instructionRows] = await Promise.all([getHospitalizationDetail(hospitalizationId), getMedicalInstructions(hospitalizationId)]);
      setDetail(hospitalization);
      setInstructions(instructionRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el internamiento.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hospitalizationId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function instructionAction(item: MedicalInstruction) {
    if (updatingInstruction) return;
    setUpdatingInstruction(item.id);
    try {
      if (item.status === 'active') await acknowledgeMedicalInstruction(item.id);
      else if (item.status === 'acknowledged') await updateMedicalInstruction(item.id, 'start');
      else if (item.status === 'in_progress') await updateMedicalInstruction(item.id, 'complete');
      await load(true);
    } catch (err) {
      Alert.alert('Indicaciones médicas', err instanceof Error ? err.message : 'No se pudo actualizar la indicación.');
    } finally {
      setUpdatingInstruction(null);
    }
  }

  if (loading) return <LoadingState label="Cargando internamiento..." />;
  const isClosed = detail ? ['discharged', 'cancelled'].includes(String(detail.status)) : false;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}
        showsVerticalScrollIndicator={false}>
        <AppHeader icon="hospital-box-outline" subtitle="Detalle de internamiento y seguimiento de enfermería." title="Internamiento" />
        {error ? <ErrorState message={error} onRetry={() => void load()} title="No se pudo cargar el internamiento" /> : null}
        {!error && !detail ? <EmptyState description="El internamiento no está disponible." title="Sin información" /> : null}
        {detail ? (
          <>
            <InpatientPatientCard detail={detail} />
            <AppCard style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.sectionTitle}>Datos del internamiento</Text>
                <HospitalizationStatusBadge status={detail.status} />
              </View>
              <Text style={styles.title}>{resolvePatientName(detail)}</Text>
              <Text style={styles.description}>Motivo: {detail.reason || 'No registrado'}</Text>
              <Text style={styles.description}>Diagnóstico de ingreso: {detail.diagnosis_at_admission || 'No registrado'}</Text>
              <Text style={styles.description}>Médico responsable: {detail.responsible_doctor_name || 'No asignado'}</Text>
              <Text style={styles.description}>Ingreso: {formatDateTime(detail.admission_datetime)}</Text>
              <Text style={[styles.description, detail.patient_allergies ? styles.alertText : undefined]}>Alergias: {detail.patient_allergies || 'No registradas'}</Text>
              <Text style={styles.description}>Antecedentes crónicos: {detail.patient_chronic_diseases || 'No registrados'}</Text>
            </AppCard>
            <CurrentBedCard detail={detail} />
            {detail.active_treatment_plan ? <AppCard style={styles.card}><Text style={styles.sectionTitle}>Plan de tratamiento v{detail.active_treatment_plan.version}</Text><Text style={styles.description}>{detail.active_treatment_plan.treatment || 'Sin detalle'}</Text>{detail.active_treatment_plan.monitoring ? <Text style={styles.description}>Monitoreo: {detail.active_treatment_plan.monitoring}</Text> : null}{detail.active_treatment_plan.precautions ? <Text style={styles.alertText}>Precauciones: {detail.active_treatment_plan.precautions}</Text> : null}</AppCard> : null}
            <Text style={styles.sectionTitle}>Indicaciones médicas activas</Text>
            {instructions.length ? instructions.map((item) => {
              const actionable = ['active', 'acknowledged', 'in_progress'].includes(item.status);
              const label = item.status === 'active' ? 'Confirmar recepción' : item.status === 'acknowledged' ? 'Iniciar' : 'Completar';
              return <AppCard key={item.id} style={styles.card}><View style={styles.rowBetween}><Text style={styles.title}>{item.title}</Text><Text style={item.priority === 'urgent' || item.priority === 'stat' ? styles.alertText : styles.description}>{item.priority || 'routine'}</Text></View><Text style={styles.description}>{item.details}</Text><Text style={styles.description}>Estado: {item.status}</Text>{actionable && !isClosed ? <AppButton label={label} loading={updatingInstruction === item.id} onPress={() => void instructionAction(item)} /> : null}</AppCard>;
            }) : <EmptyState description="El médico aún no ha registrado indicaciones activas." title="Sin indicaciones" />}
            {!isClosed ? (
              <>
                <View style={styles.actions}>
                  <AppButton label="Registrar signos" onPress={() => navigation.navigate('NurseInpatientVitalSignsForm', { hospitalizationId })} />
                  <AppButton label="Agregar nota" onPress={() => navigation.navigate('NurseNursingNoteForm', { hospitalizationId })} variant="secondary" />
                </View>
                <View style={styles.actions}>
                  <AppButton label="Rondas" onPress={() => navigation.navigate('NurseNursingRounds', { hospitalizationId })} variant="secondary" />
                  <AppButton label="Medicamentos" onPress={() => navigation.navigate('NurseMedicationAdministrations', { hospitalizationId })} variant="secondary" />
                </View>
              </>
            ) : null}
            <SectionHeader onPress={() => navigation.navigate('NurseInpatientVitalSignsHistory', { hospitalizationId })} title="Signos vitales recientes" />
            {(detail.recent_vital_signs ?? []).slice(0, 3).map((item) => <InpatientVitalSignsCard item={item} key={item.id ?? `${item.recorded_at}`} />)}
            {(detail.recent_vital_signs ?? []).length === 0 ? <EmptyState description="No hay signos vitales hospitalarios registrados." title="Sin signos" /> : null}
            <SectionHeader onPress={() => navigation.navigate('NurseNursingNotesList', { hospitalizationId })} title="Notas de enfermería recientes" />
            {(detail.recent_nursing_notes ?? []).slice(0, 3).map((item) => <NursingNoteCard item={item} key={item.id ?? `${item.recorded_at}`} />)}
            {(detail.recent_nursing_notes ?? []).length === 0 ? <EmptyState description="No hay notas de enfermería registradas." title="Sin notas" /> : null}
            <SectionHeader onPress={() => navigation.navigate('NurseHospitalizationEvents', { hospitalizationId })} title="Eventos recientes" />
            {(detail.events ?? detail.recent_events ?? []).slice(0, 4).map((item) => <HospitalizationEventCard item={item} key={item.id ?? `${item.creado_en}`} />)}
            {(detail.events ?? detail.recent_events ?? []).length === 0 ? <EmptyState description="No hay eventos registrados." title="Sin eventos" /> : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ onPress, title }: { onPress: () => void; title: string }) {
  return (
    <View style={styles.rowBetween}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text onPress={onPress} style={styles.link}>Ver todo</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  alertText: { color: colors.danger, fontSize: 13, fontWeight: '800', lineHeight: 19 },
  actions: { flexDirection: 'row', gap: 10 },
  card: { gap: 10 },
  content: { gap: 14, padding: 18, paddingBottom: 118 },
  description: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  link: { color: colors.primary, fontSize: 13, fontWeight: '900' },
  rowBetween: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  safe: { backgroundColor: colors.background, flex: 1 },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: '900' },
  title: { color: colors.ink, fontSize: 16, fontWeight: '900' },
});
