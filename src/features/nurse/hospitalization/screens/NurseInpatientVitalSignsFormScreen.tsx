import { useNavigation, useRoute } from '@react-navigation/native';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { colors } from '@/core/theme/colors';
import { InpatientVitalSignsForm } from '@/features/nurse/hospitalization/components/InpatientVitalSignsForm';
import { createInpatientVitalSigns } from '@/features/nurse/hospitalization/services/nurseHospitalizationService';
import type { InpatientVitalSignsPayload } from '@/features/nurse/hospitalization/types/nurseHospitalization.types';

export function NurseInpatientVitalSignsFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const hospitalizationId = Number(route.params?.hospitalizationId);
  const [saving, setSaving] = useState(false);

  async function submit(payload: InpatientVitalSignsPayload) {
    setSaving(true);
    try {
      await createInpatientVitalSigns(hospitalizationId, payload);
      Alert.alert('Signos hospitalarios', 'Signos vitales hospitalarios registrados correctamente.', [
        { onPress: () => navigation.navigate('NurseHospitalizationDetail', { hospitalizationId }), text: 'Aceptar' },
      ]);
    } catch (err) {
      Alert.alert('Signos hospitalarios', err instanceof Error ? err.message : 'No se pudieron registrar los signos vitales hospitalarios.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <AppHeader icon="heart-pulse" subtitle="Registro hospitalario separado del triaje inicial." title="Signos vitales hospitalarios" />
          <AppCard>
            <InpatientVitalSignsForm loading={saving} onSubmit={submit} />
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
