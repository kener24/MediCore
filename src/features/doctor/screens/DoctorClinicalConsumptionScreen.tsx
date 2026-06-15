import { useNavigation, useRoute } from '@react-navigation/native';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { colors } from '@/core/theme/colors';
import { ClinicalConsumptionForm } from '@/features/doctor/components/ClinicalConsumptionForm';
import { DoctorHeader } from '@/features/doctor/components/DoctorHeader';
import { createDoctorClinicalConsumption } from '@/features/doctor/services/doctorClinicalConsumptionService';
import type { ClinicalConsumptionPayload } from '@/features/doctor/types/doctorClinicalConsumption.types';

export function DoctorClinicalConsumptionScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = (route.params ?? {}) as { consultationId?: number; visitId?: number };
  const [submitting, setSubmitting] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  async function submit(payload: ClinicalConsumptionPayload) {
    setSubmitting(true);
    try {
      await createDoctorClinicalConsumption({ ...payload, visit: params.visitId }, params.consultationId);
      Alert.alert('Consumo clínico', 'Consumo clínico registrado correctamente.');
      navigation.goBack();
    } catch (err) {
      setUnavailable(true);
      Alert.alert('Consumo clínico', err instanceof Error ? err.message : 'El consumo clínico estará disponible en una próxima versión.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <DoctorHeader title="Consumo clínico" />
        {unavailable ? (
          <EmptyState
            description="El consumo clínico estará disponible en una próxima versión."
            title="Módulo no disponible"
          />
        ) : (
          <ClinicalConsumptionForm onSubmit={submit} submitting={submitting} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 22, paddingBottom: 34 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
});
