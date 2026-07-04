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
import { MedicalOrderForm } from '@/features/doctor/components/MedicalOrderForm';
import { MedicalOrderPreviewCard } from '@/features/doctor/components/MedicalOrderPreviewCard';
import { getMedicalOrderCatalog } from '@/features/doctor/services/doctorCatalogService';
import { resolveRequiredConsultation } from '@/features/doctor/services/doctorConsultationContextService';
import { getFavoriteOrders, rememberMedicalOrder } from '@/features/doctor/services/doctorFavoritesService';
import { createMedicalOrder, getConsultationMedicalOrders } from '@/features/doctor/services/doctorMedicalOrderService';
import { isConsultationFinalized } from '@/features/doctor/types/commonDoctor.types';
import type { InventoryItem } from '@/features/doctor/types/doctorClinicalConsumption.types';
import type { CreateMedicalOrderPayload, DoctorMedicalOrder, MedicalOrderType } from '@/features/doctor/types/doctorMedicalOrder.types';

export function DoctorMedicalOrderScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = useMemo(() => (route.params ?? {}) as { consultationId?: number; patientId?: number; visitId?: number }, [route.params]);
  const [consultationId, setConsultationId] = useState<number | undefined>(params.consultationId);
  const [items, setItems] = useState<DoctorMedicalOrder[]>([]);
  const [catalog, setCatalog] = useState<InventoryItem[]>([]);
  const [favorites, setFavorites] = useState<CreateMedicalOrderPayload[]>([]);
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
      if (context.consultationId) setItems(await getConsultationMedicalOrders(context.consultationId).catch(() => []));
      setFavorites(await getFavoriteOrders().catch(() => []));
      setCatalog(await getMedicalOrderCatalog().catch(() => []));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'El modulo de ordenes medicas aun no esta disponible.');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(payload: CreateMedicalOrderPayload) {
    if (readOnly) return Alert.alert('Orden medica', 'Esta consulta ya fue finalizada.');
    if (!consultationId) return Alert.alert('Orden medica', 'Primero debes iniciar o guardar la consulta medica.');
    setSubmitting(true);
    try {
      await createMedicalOrder(consultationId, { ...payload, visit: params.visitId });
      await rememberMedicalOrder(payload).catch(() => undefined);
      Alert.alert('Orden medica', 'Orden medica creada correctamente.');
      await load();
    } catch (err) {
      Alert.alert('Orden medica', err instanceof Error ? err.message : 'No se pudo crear la orden medica.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState label="Cargando orden medica..." />;
  if (error) return <ErrorState message={error} onRetry={load} title="No se pudo cargar orden medica" />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <DoctorHeader title="Orden medica" />
          {readOnly ? <EmptyState description="Puedes consultar ordenes existentes, pero no crear nuevas." title="Consulta finalizada" /> : null}
          <MedicalOrderPreviewCard
            items={items}
            onPressItem={(item) => navigation.navigate('DoctorMedicalOrderDetail', { order: item, orderId: item.id })}
          />
          <MedicalOrderForm
            disabled={readOnly}
            favoriteOrders={favorites}
            onSearchOrder={(value: string, type: MedicalOrderType) => getMedicalOrderCatalog(value, type).then(setCatalog).catch(() => undefined)}
            onSubmit={submit}
            orderCatalog={catalog}
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
