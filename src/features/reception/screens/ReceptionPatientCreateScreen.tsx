import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { AppInput } from '@/components/AppInput';
import { colors } from '@/core/theme/colors';
import { createMinimalPatient } from '@/features/reception/services/receptionPatientService';
import type { MinimalPatientPayload } from '@/features/reception/types/receptionPatient.types';

export function ReceptionPatientCreateScreen() {
  const navigation = useNavigation<any>();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<MinimalPatientPayload>({ full_name: '', identity_number: '', phone: '', gender: '', birth_date: '' });

  async function submit() {
    if (!form.full_name?.trim()) return Alert.alert('Paciente', 'El nombre del paciente es obligatorio.');
    setSaving(true);
    try {
      const patient = await createMinimalPatient(form);
      Alert.alert('Paciente', 'Paciente creado correctamente.', [{ text: 'Crear admisión', onPress: () => navigation.navigate('ReceptionCreateAdmission', { patientId: patient.id }) }]);
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
          <AppHeader icon="account-plus-outline" subtitle="Registro rápido sin historia clínica profunda." title="Crear paciente" />
          <AppCard style={styles.form}>
            <AppInput label="Nombre completo" onChangeText={(value) => setForm({ ...form, full_name: value })} value={form.full_name} />
            <AppInput keyboardType="number-pad" label="Identidad" onChangeText={(value) => setForm({ ...form, identity_number: value.replace(/[^0-9]/g, '') })} value={form.identity_number} />
            <AppInput keyboardType="phone-pad" label="Teléfono" onChangeText={(value) => setForm({ ...form, phone: value.replace(/[^0-9+()\-\s]/g, '') })} value={form.phone} />
            <AppInput label="Sexo" onChangeText={(value) => setForm({ ...form, gender: value })} placeholder="masculino / femenino" value={form.gender} />
            <AppInput label="Fecha de nacimiento" onChangeText={(value) => setForm({ ...form, birth_date: value })} placeholder="YYYY-MM-DD" value={form.birth_date} />
            <AppButton label="Guardar paciente" loading={saving} onPress={submit} />
          </AppCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 18, paddingBottom: 130 },
  form: { gap: 14 },
  keyboard: { flex: 1 },
  safe: { backgroundColor: colors.background, flex: 1 },
});
