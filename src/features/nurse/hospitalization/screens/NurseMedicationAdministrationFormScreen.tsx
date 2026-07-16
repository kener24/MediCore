import { useNavigation, useRoute } from '@react-navigation/native';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppDateTimeInput } from '@/components/AppDateTimeInput';
import { AppHeader } from '@/components/AppHeader';
import { AppInput } from '@/components/AppInput';
import { colors } from '@/core/theme/colors';
import { createMedicationAdministration } from '@/features/nurse/hospitalization/services/nurseHospitalizationService';
import type { MedicationAdministrationPayload } from '@/features/nurse/hospitalization/types/nurseHospitalization.types';

const routes = [['oral', 'Oral'], ['iv', 'IV'], ['im', 'IM'], ['sc', 'SC'], ['topical', 'Tópica'], ['inhaled', 'Inhalada'], ['other', 'Otra']] as const;

export function NurseMedicationAdministrationFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const hospitalizationId = Number(route.params?.hospitalizationId);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<MedicationAdministrationPayload>({ medication_name: '', dosage: '', route: 'oral', scheduled_time: '', notes: '' });

  async function submit() {
    if (!form.medication_name.trim() || !form.dosage.trim()) {
      Alert.alert('Medicamento', 'Medicamento y dosis son obligatorios.');
      return;
    }
    setSaving(true);
    try {
      await createMedicationAdministration(hospitalizationId, {
        ...form,
        dosage: form.dosage.trim(),
        medication_name: form.medication_name.trim(),
        notes: form.notes?.trim(),
        scheduled_time: form.scheduled_time?.trim(),
      });
      Alert.alert('Medicamento', 'Medicamento programado correctamente.', [{ text: 'Aceptar', onPress: () => navigation.navigate('NurseMedicationAdministrations', { hospitalizationId }) }]);
    } catch (err) {
      Alert.alert('Medicamento', err instanceof Error ? err.message : 'No se pudo programar el medicamento.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppHeader icon="pill" subtitle="Programación simple para administración de enfermería." title="Programar medicamento" />
          <AppCard style={styles.form}>
            <AppInput label="Medicamento" onChangeText={(value) => setForm({ ...form, medication_name: value })} value={form.medication_name} />
            <AppInput label="Dosis" onChangeText={(value) => setForm({ ...form, dosage: value })} value={form.dosage} />
            <Text style={styles.label}>Vía</Text>
            <View style={styles.chips}>{routes.map(([value, label]) => <Chip active={form.route === value} key={value} label={label} onPress={() => setForm({ ...form, route: value })} />)}</View>
            <AppDateTimeInput label="Fecha y hora programada" minimumDate={new Date()} onChange={(value) => setForm({ ...form, scheduled_time: value })} value={form.scheduled_time ?? ''} />
            <AppInput label="Observaciones" onChangeText={(value) => setForm({ ...form, notes: value })} value={form.notes} />
            <AppButton label="Guardar medicamento" loading={saving} onPress={submit} />
          </AppCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Chip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}><Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  chip: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  chipTextActive: { color: colors.white },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  content: { gap: 14, padding: 18, paddingBottom: 130 },
  form: { gap: 14 },
  keyboard: { flex: 1 },
  label: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  safe: { backgroundColor: colors.background, flex: 1 },
});
