import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { AppInput } from '@/components/AppInput';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { toPositiveId } from '@/core/utils/idUtils';
import {
  createMedicalEvolution,
  createMedicalInstruction,
  createTreatmentPlan,
  getDoctorHospitalization,
  getHospitalTimeline,
  getMedicalEvolutions,
  getMedicalInstructions,
  getTreatmentPlans,
  signMedicalEvolution,
  suspendMedicalInstruction,
} from '@/features/doctor/hospitalization/doctorHospitalizationService';
import type { DoctorHospitalization, MedicalEvolution, MedicalInstruction, TimelineEntry, TreatmentPlan } from '@/features/doctor/hospitalization/doctorHospitalization.types';

type Section = 'summary' | 'evolution' | 'plan' | 'instructions';

export function DoctorHospitalizationDetailScreen() {
  const route = useRoute<any>();
  const id = toPositiveId(route.params?.hospitalizationId);
  const [section, setSection] = useState<Section>('summary');
  const [hospitalization, setHospitalization] = useState<DoctorHospitalization | null>(null);
  const [evolutions, setEvolutions] = useState<MedicalEvolution[]>([]);
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [instructions, setInstructions] = useState<MedicalInstruction[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [evolution, setEvolution] = useState({ subjective: '', objective: '', assessment: '', plan: '' });
  const [plan, setPlan] = useState({ goals: '', treatment: '', monitoring: '', precautions: '', change_reason: '' });
  const [instruction, setInstruction] = useState({ instruction_type: 'general', priority: 'routine', title: '', details: '' });
  const [suspendingInstructionId, setSuspendingInstructionId] = useState<number | null>(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (!id) { setError('No se encontró el internamiento.'); setLoading(false); return; }
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [detail, evolutionRows, planRows, instructionRows, timelineRows] = await Promise.all([
        getDoctorHospitalization(id), getMedicalEvolutions(id), getTreatmentPlans(id), getMedicalInstructions(id), getHospitalTimeline(id),
      ]);
      setHospitalization(detail); setEvolutions(evolutionRows); setPlans(planRows); setInstructions(instructionRows); setTimeline(timelineRows);
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo cargar el seguimiento hospitalario.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [id]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function run(key: string, action: () => Promise<unknown>, success: string) {
    if (saving) return;
    setSaving(key);
    try { await action(); Alert.alert('Hospitalización', success); await load(true); }
    catch (err) { Alert.alert('Hospitalización', err instanceof Error ? err.message : 'No se pudo completar la acción.'); }
    finally { setSaving(''); }
  }

  async function saveEvolution() {
    if (!id || !evolution.assessment.trim() || !evolution.plan.trim()) return Alert.alert('Evolución médica', 'La evaluación y el plan son obligatorios.');
    await run('evolution', async () => { await createMedicalEvolution(id, evolution); setEvolution({ subjective: '', objective: '', assessment: '', plan: '' }); }, 'La evolución se guardó como borrador. Revísala y fírmala cuando esté completa.');
  }

  function confirmSign(item: MedicalEvolution) {
    Alert.alert('Firmar evolución', 'Después de firmarla no podrá modificarse. Las correcciones quedarán como una nueva entrada trazable.', [
      { style: 'cancel', text: 'Cancelar' },
      { onPress: () => void run(`sign-${item.id}`, () => signMedicalEvolution(item.id), 'Evolución firmada correctamente.'), text: 'Firmar' },
    ]);
  }

  async function savePlan() {
    if (!id || !plan.treatment.trim()) return Alert.alert('Plan de tratamiento', 'Describe el tratamiento.');
    if (plans.some((item) => item.status === 'active') && !plan.change_reason.trim()) return Alert.alert('Plan de tratamiento', 'Indica el motivo del cambio para conservar el historial de versiones.');
    await run('plan', async () => { await createTreatmentPlan(id, plan); setPlan({ goals: '', treatment: '', monitoring: '', precautions: '', change_reason: '' }); }, 'Se creó una nueva versión del plan de tratamiento.');
  }

  async function saveInstruction() {
    if (!id || !instruction.title.trim() || instruction.details.trim().length < 5) return Alert.alert('Indicación médica', 'Completa el título y un detalle de al menos 5 caracteres.');
    await run('instruction', async () => { await createMedicalInstruction(id, instruction); setInstruction({ instruction_type: 'general', priority: 'routine', title: '', details: '' }); }, 'Indicación enviada a enfermería.');
  }

  async function suspendInstruction(item: MedicalInstruction) {
    const reason = suspensionReason.trim();
    if (!reason) return Alert.alert('Suspender indicación', 'El motivo de suspensión es obligatorio.');
    await run(`suspend-${item.id}`, async () => {
      await suspendMedicalInstruction(item.id, reason);
      setSuspendingInstructionId(null);
      setSuspensionReason('');
    }, 'Indicación suspendida con trazabilidad.');
  }

  if (loading) return <LoadingState label="Cargando seguimiento hospitalario..." />;
  const closed = hospitalization ? ['discharged', 'cancelled'].includes(hospitalization.status) : false;

  return <SafeAreaView style={styles.safe}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}>
    <AppHeader icon="hospital-building" title="Seguimiento hospitalario" subtitle={hospitalization?.patient_name || 'Detalle clínico'} />
    {error ? <ErrorState title="No se pudo cargar el seguimiento" message={error} onRetry={() => void load()} /> : null}
    {hospitalization ? <>
      <AppCard style={styles.card}><View style={styles.row}><Text style={styles.patient}>{hospitalization.patient_name}</Text><Text style={styles.status}>{hospitalization.status}</Text></View><Text style={styles.meta}>{hospitalization.current_bed_code || 'Sin cama'} | {hospitalization.current_room || 'Sin habitación'}</Text><Text style={styles.body}>Motivo: {hospitalization.reason}</Text><Text style={styles.body}>Diagnóstico: {hospitalization.diagnosis_at_admission || 'No registrado'}</Text><Text style={hospitalization.patient_allergies ? styles.alert : styles.meta}>Alergias: {hospitalization.patient_allergies || 'No registradas'}</Text><Text style={styles.body}>Antecedentes crónicos: {hospitalization.patient_chronic_diseases || 'No registrados'}</Text></AppCard>
      <View style={styles.tabs}>{([{ key: 'summary', label: 'Resumen' }, { key: 'evolution', label: 'Evolución' }, { key: 'plan', label: 'Plan' }, { key: 'instructions', label: 'Indicaciones' }] as { key: Section; label: string }[]).map((item) => <Pressable key={item.key} onPress={() => setSection(item.key)} style={[styles.tab, section === item.key && styles.tabActive]}><Text style={[styles.tabText, section === item.key && styles.tabTextActive]}>{item.label}</Text></Pressable>)}</View>
      {section === 'summary' ? <><Text style={styles.heading}>Línea de tiempo clínica</Text>{timeline.length ? timeline.map((item) => <AppCard key={item.id} style={styles.timeline}><View style={styles.row}><Text style={styles.itemTitle}>{item.title}</Text><Text style={item.severity === 'critical' ? styles.alertSmall : styles.date}>{new Date(item.occurred_at).toLocaleString('es-HN')}</Text></View><Text style={styles.body}>{item.description}</Text><Text style={styles.date}>{item.user || 'Sistema'}</Text></AppCard>) : <EmptyState title="Sin actividad clínica" />}</> : null}
      {section === 'evolution' ? <><Text style={styles.heading}>Evoluciones médicas</Text>{!closed ? <AppCard style={styles.form}><AppInput label="Subjetivo" multiline value={evolution.subjective} onChangeText={(value) => setEvolution({ ...evolution, subjective: value })} /><AppInput label="Objetivo" multiline value={evolution.objective} onChangeText={(value) => setEvolution({ ...evolution, objective: value })} /><AppInput label="Evaluación" multiline value={evolution.assessment} onChangeText={(value) => setEvolution({ ...evolution, assessment: value })} /><AppInput label="Plan" multiline value={evolution.plan} onChangeText={(value) => setEvolution({ ...evolution, plan: value })} /><AppButton label="Guardar borrador" loading={saving === 'evolution'} onPress={() => void saveEvolution()} /></AppCard> : null}{evolutions.map((item) => <AppCard key={item.id} style={styles.card}><View style={styles.row}><Text style={styles.itemTitle}>{item.status === 'draft' ? 'Borrador' : item.status === 'signed' ? 'Firmada' : 'Corrección'}</Text><Text style={styles.date}>{item.doctor_name}</Text></View><Text style={styles.body}>{item.assessment || item.progress_notes || 'Sin evaluación'}</Text><Text style={styles.meta}>Plan: {item.plan || '-'}</Text>{item.status === 'draft' && !closed ? <AppButton label="Firmar evolución" loading={saving === `sign-${item.id}`} onPress={() => confirmSign(item)} /> : null}</AppCard>)}</> : null}
      {section === 'plan' ? <><Text style={styles.heading}>Plan de tratamiento</Text>{!closed ? <AppCard style={styles.form}><AppInput label="Objetivos" value={plan.goals} onChangeText={(value) => setPlan({ ...plan, goals: value })} /><AppInput label="Tratamiento" multiline value={plan.treatment} onChangeText={(value) => setPlan({ ...plan, treatment: value })} /><AppInput label="Monitoreo" value={plan.monitoring} onChangeText={(value) => setPlan({ ...plan, monitoring: value })} /><AppInput label="Precauciones" value={plan.precautions} onChangeText={(value) => setPlan({ ...plan, precautions: value })} /><AppInput label="Motivo del cambio" value={plan.change_reason} onChangeText={(value) => setPlan({ ...plan, change_reason: value })} /><AppButton label="Crear nueva versión" loading={saving === 'plan'} onPress={() => void savePlan()} /></AppCard> : null}{plans.map((item) => <AppCard key={item.id} style={styles.card}><View style={styles.row}><Text style={styles.itemTitle}>Versión {item.version}</Text><Text style={styles.status}>{item.status}</Text></View><Text style={styles.body}>{item.treatment || 'Sin detalle'}</Text>{item.monitoring ? <Text style={styles.meta}>Monitoreo: {item.monitoring}</Text> : null}{item.change_reason ? <Text style={styles.date}>Motivo: {item.change_reason}</Text> : null}</AppCard>)}</> : null}
      {section === 'instructions' ? <><Text style={styles.heading}>Indicaciones médicas</Text>{!closed ? <AppCard style={styles.form}><AppInput label="Tipo" helperText="general, vital_signs, diet, activity o procedure" value={instruction.instruction_type} onChangeText={(value) => setInstruction({ ...instruction, instruction_type: value })} /><AppInput label="Prioridad" helperText="routine, urgent o stat" value={instruction.priority} onChangeText={(value) => setInstruction({ ...instruction, priority: value })} /><AppInput label="Título" value={instruction.title} onChangeText={(value) => setInstruction({ ...instruction, title: value })} /><AppInput label="Detalle" multiline value={instruction.details} onChangeText={(value) => setInstruction({ ...instruction, details: value })} /><AppButton label="Enviar a enfermería" loading={saving === 'instruction'} onPress={() => void saveInstruction()} /></AppCard> : null}{instructions.map((item) => <AppCard key={item.id} style={styles.card}><View style={styles.row}><Text style={styles.itemTitle}>{item.title}</Text><Text style={item.priority === 'urgent' || item.priority === 'stat' ? styles.alertSmall : styles.status}>{item.priority}</Text></View><Text style={styles.body}>{item.details}</Text><Text style={styles.meta}>Estado: {item.status}</Text>{item.acknowledged_by_name ? <Text style={styles.date}>Recibida por {item.acknowledged_by_name}</Text> : null}{!closed && ['active', 'acknowledged', 'in_progress'].includes(item.status) ? suspendingInstructionId === item.id ? <View style={styles.form}><AppInput label="Motivo de suspensión" multiline value={suspensionReason} onChangeText={setSuspensionReason} /><AppButton label="Confirmar suspensión" loading={saving === `suspend-${item.id}`} variant="danger" onPress={() => void suspendInstruction(item)} /><AppButton label="Cancelar" variant="secondary" onPress={() => { setSuspendingInstructionId(null); setSuspensionReason(''); }} /></View> : <AppButton label="Suspender indicación" variant="secondary" onPress={() => { setSuspendingInstructionId(item.id); setSuspensionReason(''); }} /> : null}</AppCard>)}</> : null}
    </> : !error ? <EmptyState title="Internamiento no disponible" /> : null}
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

const styles = StyleSheet.create({
  alert: { color: colors.danger, fontSize: 14, fontWeight: '900' },
  alertSmall: { color: colors.danger, fontSize: 11, fontWeight: '900' },
  body: { color: colors.ink, fontSize: 14, lineHeight: 20 },
  card: { gap: 8 },
  content: { gap: 12, padding: 18, paddingBottom: 120 },
  date: { color: colors.muted, fontSize: 11 },
  flex: { flex: 1 },
  form: { gap: 12 },
  heading: { color: colors.ink, fontSize: 18, fontWeight: '900', marginTop: 4 },
  itemTitle: { color: colors.ink, flex: 1, fontSize: 15, fontWeight: '900' },
  meta: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  patient: { color: colors.ink, flex: 1, fontSize: 19, fontWeight: '900' },
  row: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  safe: { backgroundColor: colors.background, flex: 1 },
  status: { color: colors.primary, fontSize: 12, fontWeight: '900' },
  tab: { borderColor: colors.border, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  tabTextActive: { color: colors.white },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeline: { borderLeftColor: colors.primary, borderLeftWidth: 4, gap: 6 },
});
