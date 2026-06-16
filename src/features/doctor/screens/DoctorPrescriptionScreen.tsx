import { useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { DoctorHeader } from '@/features/doctor/components/DoctorHeader';
import { PrescriptionForm } from '@/features/doctor/components/PrescriptionForm';
import { PrescriptionPreviewCard } from '@/features/doctor/components/PrescriptionPreviewCard';
import { resolveRequiredConsultation } from '@/features/doctor/services/doctorConsultationContextService';
import { createPrescription, getConsultationPrescriptions } from '@/features/doctor/services/doctorPrescriptionService';
import type { CreatePrescriptionPayload, DoctorPrescription } from '@/features/doctor/types/doctorPrescription.types';

export function DoctorPrescriptionScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = useMemo(() => (route.params ?? {}) as { consultationId?: number; patientId?: number; visitId?: number }, [route.params]);
  const [consultationId, setConsultationId] = useState<number | undefined>(params.consultationId);
  const [items, setItems] = useState<DoctorPrescription[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const context = await resolveRequiredConsultation(params);
      setConsultationId(context.consultationId);
      if (context.consultationId) setItems(await getConsultationPrescriptions(context.consultationId).catch(() => []));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'El módulo de recetas aún no está disponible.');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(payload: CreatePrescriptionPayload) {
    if (!consultationId) return Alert.alert('Receta médica', 'Primero debes iniciar o guardar la consulta médica.');
    setSubmitting(true);
    try {
      await createPrescription(consultationId, { ...payload, visit: params.visitId });
      Alert.alert('Receta médica', 'Receta creada correctamente.');
      await load();
    } catch (err) {
      Alert.alert('Receta médica', err instanceof Error ? err.message : 'No se pudo crear la receta.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState label="Cargando receta médica..." />;
  if (error) return <ErrorState message={error} onRetry={load} title="No se pudo cargar receta médica" />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <DoctorHeader title="Receta médica" />
          <PrescriptionPreviewCard items={items} />
          <PrescriptionForm onSubmit={submit} submitting={submitting} />
          <AppButton label="Volver" onPress={() => navigation.goBack()} variant="secondary" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 22, paddingBottom: 128 },
  keyboard: { flex: 1 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
});
