import { useNavigation, useRoute } from '@react-navigation/native';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/core/theme/colors';
import { DoctorHeader } from '@/features/doctor/components/DoctorHeader';
import { PrescriptionForm } from '@/features/doctor/components/PrescriptionForm';
import { createDoctorPrescription } from '@/features/doctor/services/doctorPrescriptionService';
import type { CreatePrescriptionPayload } from '@/features/doctor/types/doctorPrescription.types';

export function DoctorPrescriptionScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = (route.params ?? {}) as { consultationId?: number; visitId?: number };
  const [submitting, setSubmitting] = useState(false);

  async function submit(payload: CreatePrescriptionPayload) {
    setSubmitting(true);
    try {
      await createDoctorPrescription({ ...payload, visit: params.visitId }, params.consultationId);
      Alert.alert('Receta médica', 'Receta registrada correctamente.');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Receta médica', err instanceof Error ? err.message : 'El módulo de recetas aún no está disponible.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <DoctorHeader title="Receta médica" />
        <PrescriptionForm onSubmit={submit} submitting={submitting} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 22, paddingBottom: 118 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
});
