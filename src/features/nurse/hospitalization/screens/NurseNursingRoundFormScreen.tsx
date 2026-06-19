import { useNavigation, useRoute } from '@react-navigation/native';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { AppInput } from '@/components/AppInput';
import { colors } from '@/core/theme/colors';
import { createNursingRound } from '@/features/nurse/hospitalization/services/nurseHospitalizationService';
import type { NursingRoundPayload } from '@/features/nurse/hospitalization/types/nurseHospitalization.types';

const types = [
  ['routine', 'Rutina'],
  ['urgent', 'Urgente'],
  ['medication', 'Medicamento'],
  ['follow_up', 'Seguimiento'],
  ['other', 'Otro'],
] as const;

export function NurseNursingRoundFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const hospitalizationId = Number(route.params?.hospitalizationId);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<NursingRoundPayload>({ round_type: 'routine', general_condition: '', pain_level: '', consciousness_status: '', mobility_status: '', feeding_status: '', elimination_status: '', notes: '' });

  async function submit() {
    const pain = form.pain_level === '' || form.pain_level === undefined ? undefined : Number(form.pain_level);
    if (pain !== undefined && (Number.isNaN(pain) || pain < 0 || pain > 10)) {
      Alert.alert('Ronda de enfermería', 'El nivel de dolor debe estar entre 0 y 10.');
      return;
    }
    setSaving(true);
    try {
      await createNursingRound(hospitalizationId, {
        ...form,
        consciousness_status: form.consciousness_status?.trim(),
        elimination_status: form.elimination_status?.trim(),
        feeding_status: form.feeding_status?.trim(),
        general_condition: form.general_condition?.trim(),
        mobility_status: form.mobility_status?.trim(),
        notes: form.notes?.trim(),
        pain_level: pain,
      });
      Alert.alert('Ronda de enfermería', 'Ronda registrada correctamente.', [{ text: 'Aceptar', onPress: () => navigation.navigate('NurseNursingRounds', { hospitalizationId }) }]);
    } catch (err) {
      Alert.alert('Ronda de enfermería', err instanceof Error ? err.message : 'No se pudo registrar la ronda.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppHeader icon="clipboard-pulse-outline" subtitle="Revisión básica de enfermería hospitalaria." title="Nueva ronda" />
          <AppCard style={styles.form}>
            <Text style={styles.label}>Tipo de ronda</Text>
            <View style={styles.chips}>{types.map(([value, label]) => <Chip active={form.round_type === value} key={value} label={label} onPress={() => setForm({ ...form, round_type: value })} />)}</View>
            <AppInput label="Condición general" onChangeText={(value) => setForm({ ...form, general_condition: value })} value={String(form.general_condition ?? '')} />
            <AppInput keyboardType="number-pad" label="Dolor 0-10" onChangeText={(value) => setForm({ ...form, pain_level: value.replace(/[^0-9]/g, '') })} value={String(form.pain_level ?? '')} />
            <AppInput label="Conciencia" onChangeText={(value) => setForm({ ...form, consciousness_status: value })} value={String(form.consciousness_status ?? '')} />
            <AppInput label="Movilidad" onChangeText={(value) => setForm({ ...form, mobility_status: value })} value={String(form.mobility_status ?? '')} />
            <AppInput label="Alimentación" onChangeText={(value) => setForm({ ...form, feeding_status: value })} value={String(form.feeding_status ?? '')} />
            <AppInput label="Eliminación" onChangeText={(value) => setForm({ ...form, elimination_status: value })} value={String(form.elimination_status ?? '')} />
            <AppInput label="Notas" multiline onChangeText={(value) => setForm({ ...form, notes: value })} style={styles.notes} value={String(form.notes ?? '')} />
            <AppButton label="Guardar ronda" loading={saving} onPress={submit} />
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
  notes: { minHeight: 110, textAlignVertical: 'top' },
  safe: { backgroundColor: colors.background, flex: 1 },
});
