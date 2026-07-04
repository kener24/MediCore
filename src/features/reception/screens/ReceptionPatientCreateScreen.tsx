import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppDateInput } from '@/components/AppDateInput';
import { AppHeader } from '@/components/AppHeader';
import { AppInput } from '@/components/AppInput';
import { colors } from '@/core/theme/colors';
import { createMinimalPatient } from '@/features/reception/services/receptionPatientService';
import type { MinimalPatientPayload } from '@/features/reception/types/receptionPatient.types';

const genders = [
  ['masculino', 'Masculino'],
  ['femenino', 'Femenino'],
  ['otro', 'Otro'],
  ['no_especificado', 'No especificado'],
] as const;

export function ReceptionPatientCreateScreen() {
  const navigation = useNavigation<any>();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<MinimalPatientPayload>({ full_name: '', identity_number: '', phone: '', gender: 'no_especificado', birth_date: '' });

  async function submit() {
    const fullName = form.full_name?.trim() ?? '';
    const identity = form.identity_number?.trim() ?? '';
    const phone = form.phone?.trim() ?? '';
    const birthDate = form.birth_date?.trim() ?? '';

    if (fullName.length < 5) return Alert.alert('Paciente', 'Ingresa el nombre completo del paciente.');
    if (identity && identity.length < 8) return Alert.alert('Paciente', 'La identidad debe tener al menos 8 digitos.');
    if (phone && phone.replace(/\D/g, '').length < 8) return Alert.alert('Paciente', 'El teléfono debe tener al menos 8 dígitos.');
    if (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return Alert.alert('Paciente', 'La fecha debe tener formato YYYY-MM-DD.');

    setSaving(true);
    try {
      const patient = await createMinimalPatient({ ...form, full_name: fullName, identity_number: identity, phone, birth_date: birthDate || undefined });
      Alert.alert('Paciente', 'Paciente creado correctamente.', [{ text: 'Crear admisión', onPress: () => navigation.navigate('ReceptionCreateAdmission', { patient, patientId: patient.id }) }]);
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
          <AppCard style={styles.form}>
            <AppInput autoCapitalize="words" label="Nombre completo" onChangeText={(value) => setForm({ ...form, full_name: value })} value={form.full_name} />
            <AppInput keyboardType="number-pad" label="Identidad" maxLength={20} onChangeText={(value) => setForm({ ...form, identity_number: value.replace(/[^0-9]/g, '') })} value={form.identity_number} />
            <AppInput keyboardType="phone-pad" label="Teléfono" maxLength={20} onChangeText={(value) => setForm({ ...form, phone: value.replace(/[^0-9+()\-\s]/g, '') })} value={form.phone} />
            <Text style={styles.label}>Sexo</Text>
            <View style={styles.chips}>{genders.map(([value, label]) => <Chip active={form.gender === value} key={value} label={label} onPress={() => setForm({ ...form, gender: value })} />)}</View>
            <AppDateInput label="Fecha de nacimiento" maximumDate={new Date()} onChange={(value) => setForm({ ...form, birth_date: value })} placeholder="Seleccionar fecha" value={form.birth_date ?? ''} />
            <AppButton label="Guardar paciente" loading={saving} onPress={submit} />
          </AppCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Chip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return <Text onPress={onPress} style={[styles.chip, active && styles.chipActive, active && styles.chipTextActive]}>{label}</Text>;
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
