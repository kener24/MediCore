import { useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { DoctorHeader } from '@/features/doctor/components/DoctorHeader';
import { PrescriptionForm } from '@/features/doctor/components/PrescriptionForm';
import { PrescriptionPreviewCard } from '@/features/doctor/components/PrescriptionPreviewCard';
import { getMedicationCatalog } from '@/features/doctor/services/doctorCatalogService';
import { resolveRequiredConsultation } from '@/features/doctor/services/doctorConsultationContextService';
import { getFavoriteMedications, rememberMedication } from '@/features/doctor/services/doctorFavoritesService';
import { createPrescription, getConsultationPrescriptions } from '@/features/doctor/services/doctorPrescriptionService';
import { isConsultationFinalized } from '@/features/doctor/types/commonDoctor.types';
import type { InventoryItem } from '@/features/doctor/types/doctorClinicalConsumption.types';
import type { CreatePrescriptionPayload, DoctorPrescription, PrescriptionMedicationPayload } from '@/features/doctor/types/doctorPrescription.types';

export function DoctorPrescriptionScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = useMemo(() => (route.params ?? {}) as { consultationId?: number; patientId?: number; visitId?: number }, [route.params]);
  const [consultationId, setConsultationId] = useState<number | undefined>(params.consultationId);
  const [items, setItems] = useState<DoctorPrescription[]>([]);
  const [catalog, setCatalog] = useState<InventoryItem[]>([]);
  const [favorites, setFavorites] = useState<PrescriptionMedicationPayload[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [readOnly, setReadOnly] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const context = await resolveRequiredConsultation(params);
      setConsultationId(context.consultationId);
      setReadOnly(isConsultationFinalized(context.consultation?.status));
      if (context.consultationId) setItems(await getConsultationPrescriptions(context.consultationId).catch(() => []));
      setFavorites(await getFavoriteMedications().catch(() => []));
      setCatalog(await getMedicationCatalog().catch(() => []));
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
    if (submitting) return;
    if (readOnly) return Alert.alert('Receta médica', 'Esta consulta ya fue finalizada.');
    if (!consultationId) return Alert.alert('Receta médica', 'Primero debes iniciar o guardar la consulta médica.');
    setSubmitting(true);
    try {
      await createPrescription(consultationId, { ...payload, visit: params.visitId });
      await Promise.all(payload.medications.map((item) => rememberMedication(item).catch(() => undefined)));
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
          {readOnly ? <EmptyState description="Puedes consultar recetas existentes, pero no crear nuevas." title="Consulta finalizada" /> : null}
          <PrescriptionPreviewCard
            items={items}
            onPressItem={(item) => navigation.navigate('DoctorPrescriptionDetail', { prescription: item, prescriptionId: item.id })}
          />
          <PrescriptionForm
            disabled={readOnly}
            favoriteMedications={favorites}
            medicationCatalog={catalog}
            onSearchMedication={(value) => getMedicationCatalog(value).then(setCatalog).catch(() => undefined)}
            onSubmit={submit}
            submitting={submitting}
          />
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
