import { useNavigation, useRoute } from '@react-navigation/native';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { colors } from '@/core/theme/colors';
import { NursingNoteForm } from '@/features/nurse/hospitalization/components/NursingNoteForm';
import { createNursingNote } from '@/features/nurse/hospitalization/services/nurseHospitalizationService';
import type { NursingNotePayload } from '@/features/nurse/hospitalization/types/nurseHospitalization.types';

export function NurseNursingNoteFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const hospitalizationId = Number(route.params?.hospitalizationId);
  const [saving, setSaving] = useState(false);

  async function submit(payload: NursingNotePayload) {
    setSaving(true);
    try {
      await createNursingNote(hospitalizationId, payload);
      Alert.alert('Nota de enfermería', 'Nota de enfermería registrada correctamente.', [
        { onPress: () => navigation.navigate('NurseHospitalizationDetail', { hospitalizationId }), text: 'Aceptar' },
      ]);
    } catch (err) {
      Alert.alert('Nota de enfermería', err instanceof Error ? err.message : 'No se pudo registrar la nota de enfermería.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <AppHeader icon="note-plus-outline" subtitle="Notas hospitalarias del internamiento actual." title="Nota de enfermería" />
          <AppCard>
            <NursingNoteForm loading={saving} onSubmit={submit} />
          </AppCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 18, paddingBottom: 130 },
  keyboard: { flex: 1 },
  safe: { backgroundColor: colors.background, flex: 1 },
});
