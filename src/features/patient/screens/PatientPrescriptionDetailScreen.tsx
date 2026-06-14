import { useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { StatusPill } from '@/features/patient/components/StatusPill';
import { getPatientPrescription } from '@/features/patient/services/patientPrescriptionsService';
import type { PatientPrescription } from '@/features/patient/types/patientPrescriptions.types';
import { formatDate } from '@/features/patient/utils/formatters';

export function PatientPrescriptionDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { id } = route.params as { id: number };
  const [prescription, setPrescription] = useState<PatientPrescription | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setPrescription(await getPatientPrescription(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingState label="Cargando receta..." />;
  if (error || !prescription) return <ErrorState message={error || 'No hay informacion disponible.'} onRetry={load} />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppButton label="Volver" onPress={() => navigation.goBack()} variant="secondary" />
        <AppCard>
          <StatusPill label={prescription.status} tone={prescription.status === 'emitida' ? 'success' : 'neutral'} />
          <Text style={styles.title}>{prescription.prescription_number || 'Receta medica'}</Text>
          <Text style={styles.meta}>{formatDate(prescription.issue_date || prescription.creado_en)}</Text>
          <Text style={styles.meta}>{prescription.doctor_nombre || prescription.doctor_name || 'Medico'}</Text>
          {prescription.diagnosis || prescription.diagnosis_name ? (
            <Text style={styles.text}>Diagnostico: {prescription.diagnosis || prescription.diagnosis_name}</Text>
          ) : null}
        </AppCard>

        <Text style={styles.sectionTitle}>Medicamentos</Text>
        {prescription.items?.length ? (
          prescription.items.map((item, index) => (
            <AppCard key={`${item.id ?? index}-${item.medication_name}`}>
              <Text style={styles.itemTitle}>{item.medication_name || 'Medicamento'}</Text>
              <Detail label="Dosis" value={item.dosage} />
              <Detail label="Frecuencia" value={item.frequency} />
              <Detail label="Duracion" value={item.duration} />
              <Detail label="Indicaciones" value={item.instructions} />
            </AppCard>
          ))
        ) : (
          <EmptyState description="La receta no tiene medicamentos registrados." title="Sin medicamentos" />
        )}

        {prescription.general_instructions ? (
          <AppCard>
            <Text style={styles.itemTitle}>Indicaciones generales</Text>
            <Text style={styles.text}>{prescription.general_instructions}</Text>
          </AppCard>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || 'No indicado'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 22, paddingBottom: 34 },
  detail: { gap: 3, marginTop: 10 },
  detailLabel: { color: colors.muted, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  detailValue: { color: colors.ink, fontSize: 14, lineHeight: 20 },
  itemTitle: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  meta: { color: colors.muted, fontSize: 14, marginTop: 5 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  text: { color: colors.ink, fontSize: 14, lineHeight: 21, marginTop: 10 },
  title: { color: colors.ink, fontSize: 22, fontWeight: '900', marginTop: 12 },
});
