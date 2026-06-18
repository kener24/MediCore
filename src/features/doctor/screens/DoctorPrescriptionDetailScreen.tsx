import { useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { formatDateTime } from '@/core/utils/dateUtils';
import { colors } from '@/core/theme/colors';
import { DoctorHeader } from '@/features/doctor/components/DoctorHeader';
import { getPrescriptionDetail } from '@/features/doctor/services/doctorPrescriptionService';
import type { DoctorPrescription, PrescriptionMedicationPayload } from '@/features/doctor/types/doctorPrescription.types';

export function DoctorPrescriptionDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = useMemo(() => (route.params ?? {}) as { prescription?: DoctorPrescription; prescriptionId?: number }, [route.params]);
  const [prescription, setPrescription] = useState<DoctorPrescription | null>(params.prescription ?? null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(params.prescriptionId && !params.prescription));

  const prescriptionId = params.prescriptionId ?? params.prescription?.id;

  const load = useCallback(async () => {
    if (!prescriptionId) {
      setError('No se encontró la receta médica.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setPrescription(await getPrescriptionDetail(prescriptionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la receta médica.');
    } finally {
      setLoading(false);
    }
  }, [prescriptionId]);

  useEffect(() => {
    if (!params.prescription) load();
  }, [load, params.prescription]);

  if (loading) return <LoadingState label="Cargando receta médica..." />;
  if (error) return <ErrorState message={error} onRetry={load} title="No se pudo cargar la receta" />;

  const medications = normalizeMedications(prescription?.medications);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <DoctorHeader title="Detalle de receta" />
        <AppCard style={styles.card}>
          <Text style={styles.title}>Receta #{prescription?.id ?? 'sin número'}</Text>
          <Info label="Estado" value={prescription?.status ?? 'Registrada'} />
          <Info label="Médico" value={prescription?.doctor_name} />
          <Info label="Fecha" value={formatDateTime(prescription?.created_at)} />
          <Info label="Instrucciones generales" value={prescription?.general_instructions} />
          <Info label="Notas" value={prescription?.notes} />
        </AppCard>
        {medications.length ? (
          medications.map((item, index) => (
            <AppCard key={`${item.medication_name}-${index}`} style={styles.card}>
              <Text style={styles.itemTitle}>{item.medication_name || `Medicamento ${index + 1}`}</Text>
              <Info label="Dosis" value={item.dosage} />
              <Info label="Frecuencia" value={item.frequency} />
              <Info label="Duración" value={item.duration} />
              <Info label="Cantidad" value={item.quantity ? String(item.quantity) : undefined} />
              <Info label="Indicaciones" value={item.instructions} />
            </AppCard>
          ))
        ) : (
          <EmptyState description="La receta no tiene medicamentos registrados." title="Sin medicamentos" />
        )}
        <AppButton label="Volver" onPress={() => navigation.goBack()} variant="secondary" />
      </ScrollView>
    </SafeAreaView>
  );
}

function normalizeMedications(items?: PrescriptionMedicationPayload[]) {
  return Array.isArray(items) ? items : [];
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.info}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || 'No indicado'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  content: { gap: 14, padding: 22, paddingBottom: 128 },
  info: { gap: 3 },
  itemTitle: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  label: { color: colors.muted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  title: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  value: { color: colors.ink, fontSize: 14, lineHeight: 20 },
});
