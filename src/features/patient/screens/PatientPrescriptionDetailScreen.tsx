import { useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { StatusBadge } from '@/components/StatusBadge';
import { colors } from '@/core/theme/colors';
import { formatDate } from '@/core/utils/dateUtils';
import { getPatientPrescription } from '@/features/patient/services/patientPrescriptionsService';
import type { PatientPrescription, PatientPrescriptionItem } from '@/features/patient/types/patientPrescriptions.types';

export function PatientPrescriptionDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const routeParams = (route.params ?? {}) as { id?: number | string };
  const id = Number(routeParams.id);
  const hasValidId = Number.isFinite(id) && id > 0;
  const [prescription, setPrescription] = useState<PatientPrescription | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    if (!hasValidId) {
      setError('No se encontro la receta solicitada.');
      setLoading(false);
      return;
    }
    try {
      setPrescription(await getPatientPrescription(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos.');
    } finally {
      setLoading(false);
    }
  }, [hasValidId, id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingState label="Cargando receta..." />;
  if (error || !prescription) return <ErrorState message={error || 'No hay información disponible.'} onRetry={load} />;

  const medications = normalizeMedications(prescription);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppButton label="Volver" onPress={() => navigation.goBack()} variant="secondary" />
        <AppCard>
          <StatusBadge status={prescription.status} />
          <Text style={styles.title}>{prescription.prescription_number || 'Receta medica'}</Text>
          <Text style={styles.meta}>{formatDate(prescription.issue_date || prescription.date || prescription.created_at || prescription.creado_en)}</Text>
          <Text style={styles.meta}>{prescription.doctor_nombre || prescription.doctor_name || 'Medico'}</Text>
          <Text style={styles.meta}>{prescription.clinic_name || prescription.clinic_nombre || 'Clinica no indicada'}</Text>
          {prescription.diagnosis || prescription.diagnosis_name ? (
            <Text style={styles.text}>Diagnostico: {prescription.diagnosis || prescription.diagnosis_name}</Text>
          ) : null}
        </AppCard>

        <Text style={styles.sectionTitle}>Medicamentos</Text>
        {medications.length ? (
          medications.map((item, index) => (
            <AppCard key={`${item.id ?? index}-${item.medication_name || item.name}`}>
              <Text style={styles.itemTitle}>{item.medication_name || item.name || 'Medicamento'}</Text>
              <Detail label="Dosis" value={item.dosage} />
              <Detail label="Frecuencia" value={item.frequency} />
              <Detail label="Duracion" value={item.duration} />
              <Detail label="Cantidad" value={item.quantity} />
              <Detail label="Indicaciones" value={item.instructions} />
            </AppCard>
          ))
        ) : (
          <EmptyState description="No hay medicamentos registrados en esta receta." title="Sin medicamentos" />
        )}

        {prescription.general_instructions || prescription.notes ? (
          <AppCard>
            <Text style={styles.itemTitle}>Indicaciones generales</Text>
            {prescription.general_instructions ? <Text style={styles.text}>{prescription.general_instructions}</Text> : null}
            {prescription.notes ? <Text style={styles.text}>{prescription.notes}</Text> : null}
          </AppCard>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function normalizeMedications(prescription: PatientPrescription): PatientPrescriptionItem[] {
  if (prescription.items?.length) return prescription.items;
  if (!Array.isArray(prescription.medications)) return [];
  return prescription.medications.map((item, index) =>
    typeof item === 'string' ? { id: index, medication_name: item } : item,
  );
}

function Detail({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value ? String(value) : 'No indicado'}</Text>
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
