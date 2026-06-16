import { useNavigation, useRoute } from '@react-navigation/native';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/core/theme/colors';
import { DoctorHeader } from '@/features/doctor/components/DoctorHeader';
import { MedicalOrderForm } from '@/features/doctor/components/MedicalOrderForm';
import { createDoctorMedicalOrder } from '@/features/doctor/services/doctorMedicalOrderService';
import type { CreateMedicalOrderPayload } from '@/features/doctor/types/doctorMedicalOrder.types';

export function DoctorMedicalOrderScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = (route.params ?? {}) as { consultationId?: number; visitId?: number };
  const [submitting, setSubmitting] = useState(false);

  async function submit(payload: CreateMedicalOrderPayload) {
    setSubmitting(true);
    try {
      await createDoctorMedicalOrder({ ...payload, visit: params.visitId }, params.consultationId);
      Alert.alert('Orden médica', 'Orden médica registrada correctamente.');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Orden médica', err instanceof Error ? err.message : 'El módulo de órdenes médicas aún no está disponible.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <DoctorHeader title="Orden médica" />
        <MedicalOrderForm onSubmit={submit} submitting={submitting} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 22, paddingBottom: 118 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
});
