import { useNavigation, useRoute } from '@react-navigation/native';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { ErrorState } from '@/components/ErrorState';
import { AppHeader } from '@/components/AppHeader';
import { colors } from '@/core/theme/colors';
import { VitalSignsSummary } from '@/features/nurse/components/NurseCards';
import { completeTriage } from '@/features/nurse/services/nurseApi';
import type { CompleteTriagePayload, TriagePriority } from '@/features/nurse/types/nurse.types';
import { priorityOptions, validateTriage } from '@/features/nurse/utils/nurseValidation';

export function NurseTriageFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const visitId = route.params?.visitId;
  const patient = route.params?.patient;
  const vitalSigns = route.params?.vitalSigns;
  const [chiefComplaint, setChiefComplaint] = useState(patient?.reason ?? '');
  const [initialAssessment, setInitialAssessment] = useState('');
  const [priority, setPriority] = useState<TriagePriority>('normal');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!visitId) {
      Alert.alert('Visita no encontrada', 'No se encontró la visita del paciente.');
      return;
    }
    const payload: CompleteTriagePayload = {
      visit: visitId,
      chief_complaint: chiefComplaint.trim(),
      initial_assessment: initialAssessment.trim(),
      priority,
      notes: notes.trim() || undefined,
    };
    const errors = validateTriage(payload);
    if (errors.length) {
      Alert.alert('Revisa el triaje', errors.join('\n'));
      return;
    }
    try {
      setSaving(true);
      await completeTriage(payload);
      Alert.alert('Triaje completado', 'El paciente fue enviado al médico correctamente.', [
        { text: 'Aceptar', onPress: () => navigation.navigate('NurseCompletedTriages') },
      ]);
    } catch {
      Alert.alert('No se pudo completar', 'No se pudo completar el triaje en este momento.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppHeader icon="clipboard-pulse-outline" subtitle={patient?.name ?? 'Evaluación inicial'} title="Completar triaje" />
          {!visitId ? <ErrorState message="No se encontró la visita del paciente." title="Visita no encontrada" /> : null}
          <VitalSignsSummary vitalSigns={vitalSigns} />
          {!vitalSigns ? (
            <AppButton label="Registrar signos vitales" onPress={() => navigation.navigate('NurseVitalSignsForm', { patient, visitId })} variant="secondary" />
          ) : null}
          <Text style={styles.label}>Queja principal</Text>
          <TextInput
            multiline
            onChangeText={setChiefComplaint}
            placeholder="Motivo de consulta o queja principal"
            placeholderTextColor="#98a2b3"
            style={styles.textArea}
            value={chiefComplaint}
          />
          <Text style={styles.label}>Evaluación inicial</Text>
          <TextInput
            multiline
            onChangeText={setInitialAssessment}
            placeholder="Evaluación clínica inicial"
            placeholderTextColor="#98a2b3"
            style={styles.textArea}
            value={initialAssessment}
          />
          <Text style={styles.label}>Prioridad</Text>
          <View style={styles.priorityGrid}>
            {priorityOptions.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setPriority(option.value)}
                style={[styles.priority, priority === option.value && styles.priorityActive]}>
                <Text style={[styles.priorityText, priority === option.value && styles.priorityTextActive]}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>Notas</Text>
          <TextInput
            multiline
            onChangeText={setNotes}
            placeholder="Notas adicionales"
            placeholderTextColor="#98a2b3"
            style={styles.textArea}
            value={notes}
          />
          <AppButton disabled={!visitId} label="Enviar paciente al médico" loading={saving} onPress={save} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
    padding: 18,
    paddingBottom: 130,
  },
  label: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  priority: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  priorityActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  priorityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  priorityText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  priorityTextActive: {
    color: colors.white,
  },
  safe: {
    backgroundColor: colors.background,
    flex: 1,
  },
  textArea: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.ink,
    minHeight: 104,
    padding: 14,
    textAlignVertical: 'top',
  },
});
