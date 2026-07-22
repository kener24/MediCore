import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { AppInput } from '@/components/AppInput';
import { ErrorState } from '@/components/ErrorState';
import { colors } from '@/core/theme/colors';
import { createAdmission, getReceptionDoctors, getReceptionWorkflowSettings, type ReceptionDoctorOption, type ReceptionWorkflowSettings } from '@/features/reception/services/receptionAdmissionService';
import { patientIdentity, patientName, patientPhone } from '@/features/reception/services/receptionMappers';
import type { CreateAdmissionPayload } from '@/features/reception/types/receptionAdmission.types';
import type { ReceptionPatient } from '@/features/reception/types/receptionPatient.types';

const visitTypes = [
  ['walk_in', 'Sin cita'],
  ['emergency', 'Emergencia'],
  ['follow_up', 'Seguimiento'],
  ['control', 'Control'],
  ['procedure', 'Procedimiento'],
] as const;

const priorities = [
  ['normal', 'Normal'],
  ['priority', 'Prioritario'],
  ['urgent', 'Urgente'],
  ['emergency', 'Emergencia'],
] as const;

export function ReceptionCreateAdmissionScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const selectedPatient = route.params?.patient as ReceptionPatient | undefined;
  const initialPatientId = route.params?.patientId ? String(route.params.patientId) : selectedPatient?.id ? String(selectedPatient.id) : '';
  const identity = selectedPatient ? patientIdentity(selectedPatient) : '';
  const phone = selectedPatient ? patientPhone(selectedPatient) : '';
  const [saving, setSaving] = useState(false);
  const [doctors, setDoctors] = useState<ReceptionDoctorOption[]>([]);
  const [workflow, setWorkflow] = useState<ReceptionWorkflowSettings | null>(null);
  const [workflowError, setWorkflowError] = useState('');
  const [form, setForm] = useState({ patient_id: initialPatientId, visit_type: 'walk_in', reason: '', priority: 'normal', doctor_id: '' });

  useFocusEffect(useCallback(() => {
    Promise.all([getReceptionDoctors(), getReceptionWorkflowSettings()])
      .then(([doctorList, settings]) => {
        setDoctors(doctorList);
        setWorkflow(settings);
        setWorkflowError('');
      })
      .catch((error) => {
        setDoctors([]);
        setWorkflowError(error instanceof Error ? error.message : 'No se pudo cargar la configuración de recepción.');
      });
  }, []));

  async function submit() {
    if (saving) return;
    if (workflowError) return Alert.alert('Admisión', workflowError);
    if (workflow && !workflow.allow_walk_in_patients) return Alert.alert('Admisión', 'La clínica no permite admisiones sin cita.');
    if (!form.patient_id) return Alert.alert('Admisión', 'Selecciona un paciente.');
    if (Number(form.patient_id) <= 0) return Alert.alert('Admisión', 'El paciente seleccionado no es válido.');
    if (form.reason.trim().length < 4) return Alert.alert('Admisión', 'El motivo de visita es obligatorio.');
    if ((form.priority === 'emergency' || workflow?.walk_in_requires_triage === false) && !form.doctor_id) {
      return Alert.alert('Admisión urgente', 'Para una emergencia selecciona médico destino o cambia la prioridad.');
    }
    setSaving(true);
    try {
      const payload: CreateAdmissionPayload = {
        patient_id: Number(form.patient_id),
        visit_type: form.visit_type,
        reason: form.reason.trim(),
        priority: form.priority || 'normal',
        doctor_id: form.doctor_id ? Number(form.doctor_id) : undefined,
      };
      const visit = await createAdmission(payload);
      Alert.alert('Admisión', 'Admisión registrada correctamente.', [
        { text: 'Ver visita', onPress: () => navigation.navigate('ReceptionVisitDetail', { visitId: visit.id }) },
        { text: 'Admisiones', onPress: () => navigation.navigate('ReceptionTodayAdmissions') },
      ]);
    } catch (err) {
      Alert.alert('Admisión', err instanceof Error ? err.message : 'No se pudo crear la admisión.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppHeader icon="clipboard-plus-outline" subtitle="Registra la llegada del paciente a la clínica." title="Nueva admisión" />
          {workflowError ? <ErrorState message={workflowError} title="No se pudo cargar la configuración" /> : null}
          {workflow && !workflow.allow_walk_in_patients ? <ErrorState message="La configuración de esta clínica no permite registrar pacientes sin cita." title="Admisiones sin cita deshabilitadas" /> : null}
          {workflow?.allow_walk_in_patients !== false ? (
          <AppCard style={styles.form}>
            {form.patient_id ? (
              <View style={styles.patientBox}>
                <Text style={styles.patientEyebrow}>Paciente seleccionado</Text>
                <Text style={styles.patientName}>{selectedPatient ? patientName(selectedPatient) : `Paciente #${form.patient_id}`}</Text>
                <Text style={styles.patientMeta}>Identidad: {selectedPatient ? identity : 'Pendiente de confirmar'}</Text>
                <Text style={styles.patientMeta}>Teléfono: {selectedPatient ? phone : 'No indicado'}</Text>
                <View style={styles.checklist}>
                  <ChecklistItem ok={Boolean(selectedPatient && identity !== 'Sin identidad')} text="Identidad validada" />
                  <ChecklistItem ok={Boolean(selectedPatient && phone !== 'Sin teléfono')} text="Contacto disponible" />
                  <ChecklistItem ok={Boolean(form.reason.trim().length >= 4)} text="Motivo de visita documentado" />
                </View>
                <View style={styles.actions}>
                  <AppButton label="Cambiar paciente" onPress={() => navigation.navigate('ReceptionPatientSearch')} variant="secondary" />
                </View>
              </View>
            ) : (
              <View style={styles.patientBox}>
                <Text style={styles.patientEyebrow}>Paciente requerido</Text>
                <Text style={styles.patientName}>Selecciona un paciente antes de crear la admisión.</Text>
                <Text style={styles.patientMeta}>Esto evita errores por ID manual y mantiene el expediente correcto.</Text>
                <View style={styles.actions}>
                  <AppButton label="Buscar paciente" onPress={() => navigation.navigate('ReceptionPatientSearch')} />
                  <AppButton label="Crear paciente nuevo" onPress={() => navigation.navigate('ReceptionPatientCreate')} variant="secondary" />
                </View>
              </View>
            )}
            <Text style={styles.label}>Tipo de visita</Text>
            <View style={styles.chips}>{visitTypes.map(([value, label]) => <Chip active={form.visit_type === value} key={value} label={label} onPress={() => setForm({ ...form, visit_type: value })} />)}</View>
            <AppInput label="Motivo" multiline onChangeText={(value) => setForm({ ...form, reason: value })} style={styles.notes} value={form.reason} />
            <Text style={styles.label}>Prioridad</Text>
            <View style={styles.chips}>{priorities.map(([value, label]) => <Chip active={form.priority === value} key={value} label={label} onPress={() => setForm({ ...form, priority: value })} />)}</View>
            {['urgent', 'emergency'].includes(form.priority) ? (
              <View style={styles.warningBox}>
                <Text style={styles.warningTitle}>Atención prioritaria</Text>
                <Text style={styles.warningText}>Confirma que el paciente debe pasar con prioridad y asigna médico cuando sea emergencia.</Text>
              </View>
            ) : null}
            <Text style={styles.label}>Médico destino</Text>
            <View style={styles.chips}>
              <Chip active={!form.doctor_id} label="Sin asignar" onPress={() => setForm({ ...form, doctor_id: '' })} />
              {doctors.map((doctor) => (
                <Chip
                  active={form.doctor_id === String(doctor.id)}
                  key={doctor.id}
                  label={doctor.user_nombre ?? doctor.nombre_completo ?? doctor.full_name ?? `Médico ${doctor.id}`}
                  onPress={() => setForm({ ...form, doctor_id: String(doctor.id) })}
                />
              ))}
            </View>
            <AppButton disabled={!form.patient_id || saving} label="Registrar admisión" loading={saving} onPress={submit} />
          </AppCard>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Chip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return <Text onPress={onPress} style={[styles.chip, active && styles.chipActive, active && styles.chipTextActive]}>{label}</Text>;
}

function ChecklistItem({ ok, text }: { ok: boolean; text: string }) {
  return <Text style={[styles.checkItem, ok ? styles.checkOk : styles.checkPending]}>{ok ? 'OK' : 'Pendiente'} - {text}</Text>;
}

const styles = StyleSheet.create({
  chip: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: 999, borderWidth: 1, color: colors.muted, fontSize: 12, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 9 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipTextActive: { color: colors.white },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  checkItem: { borderRadius: 999, fontSize: 11, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 5 },
  checkOk: { backgroundColor: '#dcfce7', color: colors.success },
  checkPending: { backgroundColor: '#fef3c7', color: colors.warning },
  checklist: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  content: { gap: 14, padding: 18, paddingBottom: 130 },
  form: { gap: 14 },
  keyboard: { flex: 1 },
  label: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  notes: { minHeight: 96, textAlignVertical: 'top' },
  actions: { gap: 10, marginTop: 8 },
  patientBox: { backgroundColor: colors.surfaceMuted, borderColor: colors.border, borderRadius: 16, borderWidth: 1, gap: 6, padding: 14 },
  patientEyebrow: { color: colors.primary, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  patientMeta: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  patientName: { color: colors.ink, fontSize: 17, fontWeight: '900', lineHeight: 23 },
  safe: { backgroundColor: colors.background, flex: 1 },
  warningBox: { backgroundColor: '#fffbeb', borderColor: '#fde68a', borderRadius: 14, borderWidth: 1, gap: 4, padding: 12 },
  warningText: { color: colors.warning, fontSize: 12, fontWeight: '700', lineHeight: 17 },
  warningTitle: { color: colors.warning, fontSize: 13, fontWeight: '900' },
});
