import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppDateInput } from '@/components/AppDateInput';
import { AppHeader } from '@/components/AppHeader';
import { AppInput } from '@/components/AppInput';
import { ErrorState } from '@/components/ErrorState';
import { colors } from '@/core/theme/colors';
import { isValidIdentity, isValidPhone, phoneDigits } from '@/core/utils/formValidation';
import { patientIdentity, patientName, patientPhone } from '@/features/reception/services/receptionMappers';
import { createMinimalPatient, searchPatients } from '@/features/reception/services/receptionPatientService';
import { getReceptionWorkflowSettings, type ReceptionWorkflowSettings } from '@/features/reception/services/receptionAdmissionService';
import type { MinimalPatientPayload, ReceptionPatient } from '@/features/reception/types/receptionPatient.types';

const genders = [
  ['masculino', 'Masculino'],
  ['femenino', 'Femenino'],
  ['otro', 'Otro'],
  ['no_especificado', 'No especificado'],
] as const;

export function ReceptionPatientCreateScreen() {
  const navigation = useNavigation<any>();
  const [saving, setSaving] = useState(false);
  const [workflow, setWorkflow] = useState<ReceptionWorkflowSettings | null>(null);
  const [workflowError, setWorkflowError] = useState('');
  const [form, setForm] = useState<MinimalPatientPayload>({ full_name: '', identity_number: '', phone: '', gender: 'no_especificado', birth_date: '' });

  useEffect(() => {
    getReceptionWorkflowSettings()
      .then((settings) => {
        setWorkflow(settings);
        setWorkflowError('');
      })
      .catch((error) => setWorkflowError(error instanceof Error ? error.message : 'No se pudo cargar la configuración de recepción.'));
  }, []);

  async function submit() {
    if (saving) return;
    if (workflowError) return Alert.alert('Paciente', workflowError);
    if (workflow && !workflow.reception_can_create_minimal_patient) return Alert.alert('Paciente', 'Recepción no puede crear pacientes básicos en esta clínica.');
    const fullName = form.full_name?.trim() ?? '';
    const identity = phoneDigits(form.identity_number);
    const phone = form.phone?.trim() ?? '';
    const birthDate = form.birth_date?.trim() ?? '';

    if (fullName.length < 5) return Alert.alert('Paciente', 'Ingresa el nombre completo del paciente.');
    if (!isValidIdentity(identity, workflow?.require_identity_for_patient)) return Alert.alert('Paciente', workflow?.require_identity_for_patient ? 'La identidad es obligatoria y debe tener entre 8 y 14 dígitos.' : 'La identidad debe tener entre 8 y 14 dígitos.');
    if (!isValidPhone(phone, workflow?.require_phone_for_patient)) return Alert.alert('Paciente', workflow?.require_phone_for_patient ? 'El teléfono es obligatorio y debe tener entre 8 y 15 dígitos.' : 'El teléfono debe tener entre 8 y 15 dígitos.');
    if (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return Alert.alert('Paciente', 'Selecciona una fecha de nacimiento válida.');

    const payload = { ...form, full_name: fullName, identity_number: identity || undefined, phone: phone || undefined, birth_date: birthDate || undefined };

    setSaving(true);
    try {
      const duplicate = await findPossibleDuplicate(identity, phone, fullName, birthDate);
      if (duplicate) {
        setSaving(false);
        const actions = duplicate.exactIdentity
          ? [
              { style: 'cancel' as const, text: 'Revisar datos' },
              { text: 'Ver paciente', onPress: () => navigation.navigate('ReceptionPatientDetail', { patientId: duplicate.patient.id }) },
            ]
          : [
              { style: 'cancel' as const, text: 'Revisar datos' },
              { text: 'Ver paciente', onPress: () => navigation.navigate('ReceptionPatientDetail', { patientId: duplicate.patient.id }) },
              { text: 'Crear de todos modos', onPress: () => void persistPatient(payload) },
            ];
        Alert.alert(
          duplicate.exactIdentity ? 'Paciente ya registrado' : 'Paciente posiblemente existente',
          `${patientName(duplicate.patient)}\nIdentidad: ${patientIdentity(duplicate.patient)}\nTeléfono: ${patientPhone(duplicate.patient)}`,
          actions,
        );
        return;
      }
      await persistPatient(payload);
    } catch (err) {
      Alert.alert('Paciente', err instanceof Error ? err.message : 'No se pudo crear el paciente.');
    } finally {
      setSaving(false);
    }
  }

  async function persistPatient(payload: MinimalPatientPayload) {
    if (saving) return;
    setSaving(true);
    try {
      const patient = await createMinimalPatient(payload);
      Alert.alert('Paciente', 'Paciente creado correctamente.', [
        { text: 'Ver paciente', onPress: () => navigation.navigate('ReceptionPatientDetail', { patientId: patient.id }) },
        { text: 'Crear admisión', onPress: () => navigation.navigate('ReceptionCreateAdmission', { patient, patientId: patient.id }) },
      ]);
    } catch (err) {
      Alert.alert('Paciente', err instanceof Error ? err.message : 'No se pudo crear el paciente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppHeader icon="account-plus-outline" subtitle="Registro rápido para recepción." title="Crear paciente" />
          {workflowError ? <ErrorState message={workflowError} title="No se pudo cargar la configuración" /> : null}
          {workflow && !workflow.reception_can_create_minimal_patient ? <ErrorState message="La configuración de esta clínica no permite crear pacientes desde recepción." title="Acción deshabilitada" /> : null}
          {workflow?.reception_can_create_minimal_patient !== false ? (
          <AppCard style={styles.form}>
            <AppInput autoCapitalize="words" label="Nombre completo" onChangeText={(value) => setForm({ ...form, full_name: value })} sanitizer="name" value={form.full_name} />
            <AppInput keyboardType="number-pad" label="Identidad" maxLength={14} onChangeText={(value) => setForm({ ...form, identity_number: value })} sanitizer="identity" value={form.identity_number} />
            <AppInput keyboardType="phone-pad" label="Teléfono" maxLength={20} onChangeText={(value) => setForm({ ...form, phone: value })} sanitizer="phone" value={form.phone} />
            <Text style={styles.label}>Sexo</Text>
            <View style={styles.chips}>{genders.map(([value, label]) => <Chip active={form.gender === value} key={value} label={label} onPress={() => setForm({ ...form, gender: value })} />)}</View>
            <AppDateInput label="Fecha de nacimiento" maximumDate={new Date()} onChange={(value) => setForm({ ...form, birth_date: value })} placeholder="Seleccionar fecha" value={form.birth_date ?? ''} />
            <AppButton disabled={saving} label="Guardar paciente" loading={saving} onPress={submit} />
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

async function findPossibleDuplicate(identity: string, phone: string, fullName: string, birthDate: string): Promise<{ exactIdentity: boolean; patient: ReceptionPatient } | null> {
  const terms = [identity, phoneDigits(phone), fullName.trim()].filter((term) => term.length >= 5);
  for (const term of terms) {
    const matches = await searchPatients(term).catch(() => []);
    const duplicate = matches.find((patient) => {
      const sameIdentity = identity && phoneDigits(patientIdentity(patient)) === phoneDigits(identity);
      const samePhone = phone && phoneDigits(patientPhone(patient)) === phoneDigits(phone);
      const patientBirthDate = patient.birth_date ?? patient.fecha_nacimiento ?? '';
      const sameNameAndBirthDate = Boolean(birthDate && patientBirthDate === birthDate && patientName(patient).trim().toLocaleLowerCase() === fullName.trim().toLocaleLowerCase());
      return sameIdentity || samePhone || sameNameAndBirthDate;
    });
    if (duplicate) return { exactIdentity: Boolean(identity && phoneDigits(patientIdentity(duplicate)) === phoneDigits(identity)), patient: duplicate };
  }
  return null;
}

const styles = StyleSheet.create({
  chip: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: 999, borderWidth: 1, color: colors.muted, fontSize: 12, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 9 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipTextActive: { color: colors.white },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  content: { gap: 14, padding: 18, paddingBottom: 130 },
  form: { gap: 14 },
  keyboard: { flex: 1 },
  label: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  safe: { backgroundColor: colors.background, flex: 1 },
});
