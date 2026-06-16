import { useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { ClinicalSummaryCard } from '@/features/doctor/components/ClinicalSummaryCard';
import { ConsultationActionBar } from '@/features/doctor/components/ConsultationActionBar';
import { ConsultationForm } from '@/features/doctor/components/ConsultationForm';
import { ConsultationStatusBadge } from '@/features/doctor/components/ConsultationStatusBadge';
import { DoctorHeader } from '@/features/doctor/components/DoctorHeader';
import { PatientSummaryCard } from '@/features/doctor/components/PatientSummaryCard';
import { VisitInfoCard } from '@/features/doctor/components/VisitInfoCard';
import {
  createConsultation,
  getConsultationByVisit,
  getConsultationDetail,
  saveConsultationDraft,
  startConsultation,
  updateConsultation,
} from '@/features/doctor/services/doctorConsultationService';
import {
  getPatientMedicalSummary,
  getPatientSummary,
  getVisitDetail,
  getVisitTriage,
  getVisitVitalSigns,
} from '@/features/doctor/services/doctorPatientService';
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
  consultationId?: number;
  patient?: DoctorPatientSummary | DoctorPatientBasicInfo | null;
  patientId?: number;
  visitId?: number;
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

  const consultationId = consultation?.id ?? consultation?.consultation_id ?? params.consultationId;
  const visitId = params.visitId ?? consultation?.visit_id ?? consultation?.patient_visit ?? visit?.id ?? visit?.visit_id;
  const resolvedPatientId =
    params.patientId ??
    patient?.id ??
    consultation?.patient_id ??
    (typeof consultation?.patient === 'number' ? consultation.patient : undefined) ??
    visit?.patient_id ??
    visit?.paciente_id;
  const completed = ['completed', 'completada', 'finalizada', 'atendida'].includes((consultation?.status ?? '').toLowerCase());

  const load = useCallback(async () => {
    if (!params.visitId) {
      setLoading(false);
      setError('No se encontró la visita para iniciar la consulta.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const [visitData, vitalsData, triageData] = await Promise.all([
        getVisitDetail(params.visitId).catch(() => null),
        getVisitVitalSigns(params.visitId).catch(() => null),
        getVisitTriage(params.visitId).catch(() => null),
      ]);

      let consultationData: DoctorConsultation | null = null;
      if (params.consultationId) {
        consultationData = await getConsultationDetail(params.consultationId).catch(() => null);
      }
      if (!consultationData) {
        consultationData = await getConsultationByVisit(params.visitId).catch(() => null);
      }
      if (!consultationData) {
        const started = await startConsultation(params.visitId).catch(() => null);
        const newConsultationId = started?.consultation_id ?? started?.id;
        if (newConsultationId) {
          consultationData = await getConsultationDetail(newConsultationId).catch(() => ({
            consultation_id: newConsultationId,
            id: newConsultationId,
            status: started?.status ?? 'in_progress',
            visit_id: params.visitId,
          }));
        } else if (started) {
          consultationData = {
            id: started.id,
            consultation_id: started.consultation_id,
            status: started.status ?? 'in_progress',
            visit_id: started.visit_id ?? params.visitId,
          };
        }
      }

      const nextPatientId =
        params.patientId ??
        visitData?.patient_id ??
        visitData?.paciente_id ??
        visitData?.patient?.id ??
        consultationData?.patient_id ??
        (typeof consultationData?.patient === 'number' ? consultationData.patient : undefined);

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
        mergePatient(patientData, visitData?.patient, params.patient as DoctorPatientBasicInfo | undefined, {
          full_name: consultationData?.patient_name ?? consultationData?.patient_nombre,
          id: nextPatientId,
          patient_code: consultationData?.patient_codigo,
        }),
      );
      setForm(toFormValues(consultationData));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error en el servidor.');
    } finally {
      setLoading(false);
    }
  }, [params.consultationId, params.patient, params.patientId, params.visitId]);

  useEffect(() => {
    load();
  }, [load]);

  function updateField(field: keyof ConsultationFormValues, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSaveDraft() {
    const validation = validateDraft(form);
    if (validation) {
      Alert.alert('Consulta médica', validation);
      return;
    }
    await persist('draft');
  }

  async function handleSave() {
    const validation = validateFormalSave(form);
    if (validation) {
      Alert.alert('Consulta médica', validation);
      return;
    }
    await persist('in_progress');
  }

  async function persist(status: 'draft' | 'in_progress') {
    if (completed) {
      Alert.alert('Consulta médica', 'Esta consulta ya fue finalizada.');
      return;
    }
    if (!params.visitId) {
      Alert.alert('Consulta médica', 'No se encontró la visita para iniciar la consulta.');
      return;
    }

    const setBusy = status === 'draft' ? setSavingDraft : setSaving;
    setBusy(true);
    try {
      const payload = buildPayload(form, status, params.visitId, resolvedPatientId);
      let saved: DoctorConsultation;
      if (consultationId) {
        saved =
          status === 'draft'
            ? await saveConsultationDraft(consultationId, payload)
            : await updateConsultation(consultationId, payload);
      } else {
        saved = await createConsultation(payload);
      }
      setConsultation(saved);
      setForm(toFormValues(saved));
      Alert.alert(
        'Consulta médica',
        status === 'draft' ? 'Borrador guardado correctamente.' : 'Consulta guardada correctamente.',
      );
    } catch (err) {
      Alert.alert('Consulta médica', err instanceof Error ? err.message : 'Revisa los campos ingresados.');
    } finally {
      setBusy(false);
    }
  }

  function navigateAction(routeName: string) {
    if (!consultationId) {
      Alert.alert('Consulta médica', 'Guarda la consulta antes de continuar con este módulo.');
      return;
    }
    navigation.navigate(routeName, {
      consultationId,
      patientId: resolvedPatientId,
      visitId,
    });
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
          {completed ? (
            <EmptyState description="Esta consulta ya fue finalizada." title="Consulta en modo lectura" />
          ) : null}
          <PatientSummaryCard patient={patient} />
          <VisitInfoCard visit={visit} />
          <ClinicalSummaryCard medicalSummary={medicalSummary} triage={triage} visit={visit} vitalSigns={vitalSigns} />
          <ConsultationForm
            disabled={completed}
            initialValues={form}
            loading={saving || savingDraft}
            onChange={updateField}
            onSaveDraft={handleSaveDraft}
            onSubmit={handleSave}
          />
          <ConsultationActionBar
            disabled={completed}
            onClinicalConsumption={() => navigateAction('DoctorClinicalConsumption')}
            onMedicalOrder={() => navigateAction('DoctorMedicalOrder')}
            onPrescription={() => navigateAction('DoctorPrescription')}
          />
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
    diagnosis_text: form.diagnosis_text.trim(),
    history_present_illness: form.history_present_illness.trim(),
    notes: form.notes.trim(),
    patient: patientId,
    clinical_assessment: form.assessment.trim(),
    physical_examination: form.physical_examination.trim(),
    physical_exam: form.physical_examination.trim(),
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

function validateDraft(form: ConsultationFormValues) {
  const hasContent = Object.values(form).some((value) => value.trim().length > 0);
  return hasContent ? '' : 'No hay información para guardar.';
}

function validateFormalSave(form: ConsultationFormValues) {
  if (form.chief_complaint.trim().length < 3) return 'Escribe el motivo principal.';
  if (form.diagnosis_text.trim().length < 3 && form.assessment.trim().length < 3) {
    return 'Agrega un diagnóstico o evaluación clínica.';
  }
  return '';
}

function mergePatient(
  ...values: (DoctorPatientBasicInfo | null | undefined)[]
): DoctorPatientBasicInfo | null {
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
