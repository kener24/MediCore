import { useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { ClinicalConsumptionCard } from '@/features/doctor/components/ClinicalConsumptionCard';
import { ClinicalConsumptionForm } from '@/features/doctor/components/ClinicalConsumptionForm';
import { DoctorHeader } from '@/features/doctor/components/DoctorHeader';
import { resolveRequiredConsultation } from '@/features/doctor/services/doctorConsultationContextService';
import {
  createClinicalConsumption,
  getAvailableInventoryItems,
  getConsultationConsumptions,
} from '@/features/doctor/services/doctorClinicalConsumptionService';
import { isConsultationFinalized } from '@/features/doctor/types/commonDoctor.types';
import type {
  ClinicalConsumptionPayload,
  DoctorClinicalConsumption,
  InventoryItem,
} from '@/features/doctor/types/doctorClinicalConsumption.types';

export function DoctorClinicalConsumptionScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = useMemo(() => (route.params ?? {}) as { consultationId?: number; patientId?: number; visitId?: number }, [route.params]);
  const [consultationId, setConsultationId] = useState<number | undefined>(params.consultationId);
  const [items, setItems] = useState<DoctorClinicalConsumption[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [inventoryUnavailable, setInventoryUnavailable] = useState(false);
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
      if (context.consultationId) setItems(await getConsultationConsumptions(context.consultationId).catch(() => []));
      const inventory = await getAvailableInventoryItems().catch(() => null);
      if (inventory) setInventoryItems(inventory);
      else setInventoryUnavailable(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'El consumo clínico estará disponible en una próxima versión.');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    load();
  }, [load]);

  async function changeSearch(value: string) {
    setSearch(value);
    const inventory = await getAvailableInventoryItems(value).catch(() => null);
    if (inventory) setInventoryItems(inventory);
  }

  async function submit(payload: ClinicalConsumptionPayload) {
    if (submitting) return;
    if (readOnly) return Alert.alert('Consumo clínico', 'Esta consulta ya fue finalizada.');
    if (!consultationId) return Alert.alert('Consumo clínico', 'Primero debes iniciar o guardar la consulta médica.');
    setSubmitting(true);
    try {
      await createClinicalConsumption(consultationId, { ...payload, visit: params.visitId });
      Alert.alert('Consumo clínico', 'Consumo clínico registrado correctamente.');
      await load();
    } catch (err) {
      Alert.alert('Consumo clínico', err instanceof Error ? err.message : 'No se pudo registrar el consumo clínico.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState label="Cargando consumo clínico..." />;
  if (error) return <ErrorState message={error} onRetry={load} title="No se pudo cargar consumo clínico" />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <DoctorHeader title="Consumo clínico" />
          {readOnly ? <EmptyState description="Puedes consultar consumos existentes, pero no crear nuevos." title="Consulta finalizada" /> : null}
          {inventoryUnavailable ? (
            <EmptyState description="Puedes registrar el insumo manualmente si el backend lo permite." title="Inventario no conectado" />
          ) : null}
          <ClinicalConsumptionCard items={items} />
          <ClinicalConsumptionForm
            disabled={readOnly}
            inventoryItems={inventoryItems}
            onChangeSearch={inventoryUnavailable || readOnly ? undefined : changeSearch}
            onSubmit={submit}
            search={search}
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
