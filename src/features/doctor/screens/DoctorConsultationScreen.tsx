import { useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { toPositiveId } from '@/core/utils/idUtils';
import { ClinicalSummaryCard } from '@/features/doctor/components/ClinicalSummaryCard';
import { ClinicalRiskBanner } from '@/features/doctor/components/ClinicalRiskBanner';
import { ClinicalTimelineSection } from '@/features/doctor/components/ClinicalTimelineSection';
import { ConsultationActionBar } from '@/features/doctor/components/ConsultationActionBar';
import { ConsultationForm } from '@/features/doctor/components/ConsultationForm';
import { ConsultationStatusBadge } from '@/features/doctor/components/ConsultationStatusBadge';
import { DoctorHeader } from '@/features/doctor/components/DoctorHeader';
import { PatientSummaryCard } from '@/features/doctor/components/PatientSummaryCard';
import { VisitInfoCard } from '@/features/doctor/components/VisitInfoCard';
import {
  completeConsultation,
  completeConsultationById,
  createConsultation,
  getConsultationByVisit,
  getConsultationDetail,
  saveConsultationDraft,
  startConsultation,
  updateConsultation,
} from '@/features/doctor/services/doctorConsultationService';
import {
  clearDoctorConsultationDraft,
  getDoctorConsultationDraft,
  saveDoctorConsultationDraft,
} from '@/features/doctor/services/doctorLocalDraftService';
import {
  getPatientMedicalSummary,
  getPatientSummary,
  getVisitDetail,
  getVisitTriage,
  getVisitVitalSigns,
} from '@/features/doctor/services/doctorPatientService';
import { isConsultationFinalized } from '@/features/doctor/types/commonDoctor.types';
import type {
  ConsultationFormValues,
  ConsultationPayload,
  DoctorConsultation,
  DoctorPatientSummary,
} from '@/features/doctor/types/doctorConsultation.types';
import type {
  DoctorPatientBasicInfo,
  DoctorPatientMedicalSummary,
  DoctorTriageInfo,
  DoctorVisitDetail,
  DoctorVitalSigns,
} from '@/features/doctor/types/doctorPatient.types';
import {
  validateConsultationDraft,
  validateConsultationFinish,
  validateConsultationSave,
} from '@/features/doctor/utils/clinicalValidation';

const emptyForm: ConsultationFormValues = {
  assessment: '',
  chief_complaint: '',
  diagnosis_text: '',
  history_present_illness: '',
  notes: '',
  physical_examination: '',
  plan: '',
  recommendations: '',
};

type RouteParams = {
  consultationId?: number | string;
  patient?: DoctorPatientSummary | DoctorPatientBasicInfo | null;
  patientId?: number | string;
  visitId?: number | string;
};

export function DoctorConsultationScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = useMemo(() => (route.params ?? {}) as RouteParams, [route.params]);

  const [consultation, setConsultation] = useState<DoctorConsultation | null>(null);
  const [form, setForm] = useState<ConsultationFormValues>(emptyForm);
  const [patient, setPatient] = useState<DoctorPatientBasicInfo | null>((params.patient as DoctorPatientBasicInfo) ?? null);
  const [visit, setVisit] = useState<Partial<DoctorVisitDetail> | null>(null);
  const [vitalSigns, setVitalSigns] = useState<DoctorVitalSigns | null>(null);
  const [triage, setTriage] = useState<DoctorTriageInfo | null>(null);
  const [medicalSummary, setMedicalSummary] = useState<DoctorPatientMedicalSummary | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [saving, setSaving] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const consultationId = toPositiveId(consultation?.id ?? consultation?.consultation_id ?? params.consultationId);
  const visitId = toPositiveId(params.visitId ?? consultation?.visit_id ?? consultation?.patient_visit ?? visit?.id ?? visit?.visit_id);
  const resolvedPatientId =
    toPositiveId(params.patientId) ??
    toPositiveId(patient?.id) ??
    toPositiveId(consultation?.patient_id) ??
    toPositiveId(typeof consultation?.patient === 'number' ? consultation.patient : undefined) ??
    toPositiveId(visit?.patient_id ?? visit?.paciente_id);
  const completed = isConsultationFinalized(consultation?.status);
  const busy = saving || savingDraft || finishing;
  const localDraftKey = visitId ?? consultationId;

  const load = useCallback(async () => {
    const routeVisitId = toPositiveId(params.visitId);
    const routeConsultationId = toPositiveId(params.consultationId);
    if (!routeVisitId && !routeConsultationId) {
      setLoading(false);
      setError('No se encontró la consulta médica.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      let consultationData: DoctorConsultation | null = null;
      if (routeConsultationId) {
        consultationData = await getConsultationDetail(routeConsultationId).catch(() => null);
      }

      const initialVisitId = toPositiveId(routeVisitId ?? consultationData?.visit_id ?? consultationData?.patient_visit);
      const [visitData, vitalsData, triageData] = await Promise.all([
        initialVisitId ? getVisitDetail(initialVisitId).catch(() => null) : Promise.resolve(null),
        initialVisitId ? getVisitVitalSigns(initialVisitId).catch(() => null) : Promise.resolve(null),
        initialVisitId ? getVisitTriage(initialVisitId).catch(() => null) : Promise.resolve(null),
      ]);

      if (!consultationData && initialVisitId) {
        consultationData = await getConsultationByVisit(initialVisitId).catch(() => null);
      }
      if (!consultationData && initialVisitId) {
        const started = await startConsultation(initialVisitId).catch(() => null);
        const newConsultationId = started?.consultation_id ?? started?.id;
        if (newConsultationId) {
          consultationData = await getConsultationDetail(newConsultationId).catch(() => ({
            consultation_id: newConsultationId,
            id: newConsultationId,
            status: started?.status ?? 'in_progress',
            visit_id: initialVisitId,
          }));
        } else if (started) {
          consultationData = {
            id: started.id,
            consultation_id: started.consultation_id,
            status: started.status ?? 'in_progress',
            visit_id: started.visit_id ?? initialVisitId,
          };
        }
      }

      const nextPatientId =
        toPositiveId(params.patientId) ??
        toPositiveId(visitData?.patient_id ?? visitData?.paciente_id) ??
        toPositiveId(typeof visitData?.patient === 'object' ? visitData.patient?.id : undefined) ??
        toPositiveId(consultationData?.patient_id) ??
        toPositiveId(typeof consultationData?.patient === 'number' ? consultationData.patient : undefined);

      const [patientData, medicalData] = await Promise.all([
        nextPatientId ? getPatientSummary(nextPatientId).catch(() => null) : Promise.resolve(null),
        nextPatientId ? getPatientMedicalSummary(nextPatientId).catch(() => null) : Promise.resolve(null),
      ]);

      setVisit(visitData ?? null);
      setVitalSigns(vitalsData ?? triageData?.vital_signs ?? null);
      setTriage(triageData);
      setMedicalSummary(medicalData);
      setConsultation(consultationData);
      setPatient(
        mergePatient(patientData, typeof visitData?.patient === 'object' ? visitData.patient : undefined, params.patient as DoctorPatientBasicInfo | undefined, {
          full_name: consultationData?.patient_name ?? consultationData?.patient_nombre,
          id: nextPatientId,
          patient_code: consultationData?.patient_codigo,
        }),
      );
      const serverForm = toFormValues(consultationData);
      const localDraft = initialVisitId ? await getDoctorConsultationDraft(initialVisitId).catch(() => null) : null;
      setForm(hasFormContent(serverForm) ? serverForm : localDraft?.values ?? serverForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la consulta. Actualiza e intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }, [params.consultationId, params.patient, params.patientId, params.visitId]);

  useEffect(() => {
    load();
  }, [load]);

  function updateField(field: keyof ConsultationFormValues, value: string) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (localDraftKey && !completed) saveDoctorConsultationDraft(localDraftKey, next).catch(() => undefined);
      return next;
    });
  }

  async function handleSaveDraft() {
    if (busy) return;
    const validation = validateConsultationDraft(form);
    if (validation) return Alert.alert('Consulta médica', validation);
    await persist('draft');
  }

  async function handleSave() {
    if (busy) return;
    const validation = validateConsultationSave(form);
    if (validation) return Alert.alert('Consulta médica', validation);
    await persist('in_progress');
  }

  async function persist(status: 'draft' | 'in_progress') {
    if (busy) return;
    if (completed) return Alert.alert('Consulta médica', 'Esta consulta ya fue finalizada.');
    if (!visitId && !consultationId) return Alert.alert('Consulta médica', 'No se encontró la visita o consulta.');

    const setBusy = status === 'draft' ? setSavingDraft : setSaving;
    setBusy(true);
    try {
      const payload = buildPayload(form, status, visitId, resolvedPatientId);
      const saved = consultationId
        ? status === 'draft'
          ? await saveConsultationDraft(consultationId, payload)
          : await updateConsultation(consultationId, payload)
        : await createConsultation(payload);
      setConsultation(saved);
      setForm(toFormValues(saved));
      if (localDraftKey) await clearDoctorConsultationDraft(localDraftKey).catch(() => undefined);
      Alert.alert('Consulta médica', status === 'draft' ? 'Borrador guardado correctamente.' : 'Consulta guardada correctamente.');
    } catch (err) {
      Alert.alert('Consulta médica', err instanceof Error ? err.message : 'No se pudo guardar la consulta.');
    } finally {
      setBusy(false);
    }
  }

  function navigateAction(routeName: string) {
    if (!consultationId) {
      Alert.alert('Consulta médica', 'Primero debes guardar la consulta médica para continuar.');
      return;
    }
    navigation.navigate(routeName, { consultationId, patientId: resolvedPatientId, visitId });
  }

  function confirmFinish() {
    if (busy) return;
    if (completed) return Alert.alert('Finalizar consulta', 'Esta consulta ya fue finalizada.');
    const validation = validateConsultationFinish(form, consultation);
    if (validation) return Alert.alert('Finalizar consulta', validation);
    if (!visitId) return Alert.alert('Finalizar consulta', 'No se encontró la visita asociada.');
    Alert.alert('Finalizar consulta', 'Después de finalizar no podrás editar esta consulta. ¿Deseas continuar?', [
      { style: 'cancel', text: 'Cancelar' },
      { onPress: finishConsultation, text: 'Finalizar' },
    ]);
  }

  async function finishConsultation() {
    if (busy || !visitId) return;
    setFinishing(true);
    try {
      const payload = buildPayload(form, 'in_progress', visitId, resolvedPatientId);
      const saved = consultationId ? await updateConsultation(consultationId, payload) : await createConsultation(payload);
      const currentConsultationId = saved.id ?? saved.consultation_id ?? consultationId;
      if (!currentConsultationId) throw new Error('No se pudo confirmar la consulta para finalizar.');
      await completeConsultation(visitId, { status: 'completed' }).catch(() =>
        completeConsultationById(currentConsultationId, { status: 'completed' }),
      );
      await Promise.all([
        clearDoctorConsultationDraft(visitId).catch(() => undefined),
        currentConsultationId ? clearDoctorConsultationDraft(currentConsultationId).catch(() => undefined) : Promise.resolve(),
      ]);
      setConsultation({ ...saved, status: 'completed' });
      Alert.alert('Consulta finalizada', 'Consulta finalizada correctamente.', [
        { onPress: () => navigation.getParent()?.navigate('DoctorWaitingRoomTab'), text: 'Aceptar' },
      ]);
    } catch (err) {
      Alert.alert('Finalizar consulta', err instanceof Error ? err.message : 'No se pudo finalizar la consulta.');
    } finally {
      setFinishing(false);
    }
  }

  if (loading) return <LoadingState label="Cargando consulta médica..." />;
  if (error) return <ErrorState message={error} onRetry={load} title="No se pudo cargar la consulta" />;

  const subtitle = completed
    ? 'Esta consulta ya fue finalizada.'
    : consultation?.status
      ? `Estado: ${consultation.status}`
      : 'Consulta en progreso';

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <DoctorHeader title="Consulta médica" />
          <View style={styles.statusRow}>
            <Text style={styles.subtitle}>{subtitle}</Text>
            <ConsultationStatusBadge status={consultation?.status ?? 'in_progress'} />
          </View>
          {completed ? <EmptyState description="No puedes editarla desde la app." title="Consulta en modo lectura" /> : null}
          <PatientSummaryCard patient={patient} />
          <VisitInfoCard visit={visit} />
          <ClinicalRiskBanner medicalSummary={medicalSummary} />
          <ClinicalSummaryCard medicalSummary={medicalSummary} triage={triage} visit={visit} vitalSigns={vitalSigns} />
          <ClinicalTimelineSection medicalSummary={medicalSummary} />
          <ConsultationForm
            disabled={completed}
            initialValues={form}
            loading={busy}
            onChange={updateField}
            onFinish={confirmFinish}
            onSaveDraft={handleSaveDraft}
            onSubmit={handleSave}
          />
          <ConsultationActionBar
            disabled={!consultationId}
            onClinicalConsumption={() => navigateAction('DoctorClinicalConsumption')}
            onMedicalOrder={() => navigateAction('DoctorMedicalOrder')}
            onPrescription={() => navigateAction('DoctorPrescription')}
            onSummary={() => navigateAction('DoctorConsultationSummary')}
            readOnly={completed}
          />
          {resolvedPatientId ? (
            <AppButton label="Historial del paciente" onPress={() => navigation.navigate('DoctorConsultationHistory', { patientId: resolvedPatientId })} variant="secondary" />
          ) : null}
          <AppButton label="Volver" onPress={() => navigation.goBack()} variant="secondary" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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

function buildPayload(
  form: ConsultationFormValues,
  status: 'draft' | 'in_progress',
  visitId?: number,
  patientId?: number,
): ConsultationPayload {
  return {
    assessment: form.assessment.trim(),
    chief_complaint: form.chief_complaint.trim(),
    clinical_assessment: form.assessment.trim(),
    diagnosis_text: form.diagnosis_text.trim(),
    history_present_illness: form.history_present_illness.trim(),
    notes: form.notes.trim(),
    patient: patientId,
    physical_exam: form.physical_examination.trim(),
    physical_examination: form.physical_examination.trim(),
    plan: form.plan.trim(),
    preliminary_diagnosis: form.diagnosis_text.trim(),
    private_notes: form.notes.trim(),
    recommendations: form.recommendations.trim(),
    status,
    symptoms: form.history_present_illness.trim(),
    treatment_plan: form.plan.trim(),
    visit: visitId,
  };
}

function hasFormContent(form: ConsultationFormValues) {
  return Object.values(form).some((value) => value.trim().length > 0);
}

function mergePatient(...values: (DoctorPatientBasicInfo | null | undefined)[]): DoctorPatientBasicInfo | null {
  const filled = values.filter(Boolean) as DoctorPatientBasicInfo[];
  if (!filled.length) return null;
  return filled.reduce((acc, item) => ({ ...acc, ...item }), {});
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 22, paddingBottom: 128 },
  keyboard: { flex: 1 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  statusRow: { alignItems: 'flex-start', gap: 8 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20 },
});
