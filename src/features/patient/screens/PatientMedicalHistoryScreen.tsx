import { useFocusEffect } from '@react-navigation/native';
import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppCard } from '@/components/AppCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { formatDate } from '@/core/utils/dateUtils';
import { PatientHeader } from '@/features/patient/components/PatientHeader';
import { getPatientDischargeSummaries, getPatientMedicalRecordSummary, type PatientDischargeSummary } from '@/features/patient/services/patientMedicalRecordService';
import type { PatientMedicalRecordSummary } from '@/features/patient/types/patientMedicalRecord.types';

export function PatientMedicalHistoryScreen() {
  const [summary, setSummary] = useState<PatientMedicalRecordSummary | null>(null);
  const [dischargeSummaries, setDischargeSummaries] = useState<PatientDischargeSummary[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [record, discharges] = await Promise.all([getPatientMedicalRecordSummary(), getPatientDischargeSummaries()]);
      setSummary(record);
      setDischargeSummaries(discharges);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el expediente.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <LoadingState label="Cargando expediente..." />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => load(true)} refreshing={refreshing} />}
        showsVerticalScrollIndicator={false}>
        <PatientHeader subtitle="Resumen clínico visible para paciente." title="Historial clínico" />
        {error ? (
          <ErrorState message={error} onRetry={() => load()} title="No se pudo cargar el expediente" />
        ) : summary ? (
          <>
            <AppCard style={styles.card}>
              <Text style={styles.title}>{summary.record_number || 'Expediente clínico'}</Text>
              <Detail label="Tipo de sangre" value={summary.blood_type} />
              <Detail label="Alergias" value={summary.allergies} />
              <Detail label="Enfermedades cronicas" value={summary.chronic_diseases} />
              <Detail label="Medicamentos actuales" value={summary.current_medications} />
            </AppCard>

            <Section title="Consultas recientes">
              {summary.consultations?.length ? (
                summary.consultations.map((item) => (
                  <AppCard key={item.id}>
                    <Text style={styles.itemTitle}>{formatDate(item.consultation_date)}</Text>
                    <Detail label="Motivo" value={item.chief_complaint} />
                    <Detail label="Evaluación" value={item.clinical_assessment} />
                    <Detail label="Diagnóstico" value={item.preliminary_diagnosis} />
                    <Detail label="Plan" value={item.treatment_plan} />
                  </AppCard>
                ))
              ) : (
                <EmptyState description="No hay consultas finalizadas visibles." title="Sin consultas" />
              )}
            </Section>

            <Section title="Diagnósticos">
              {summary.diagnoses?.length ? (
                summary.diagnoses.map((item) => (
                  <AppCard key={item.id}>
                    <Text style={styles.itemTitle}>{item.name || 'Diagnóstico'}</Text>
                    <Text style={styles.meta}>{item.code || 'Sin código'} · {item.diagnosis_type || 'Tipo no indicado'}</Text>
                  </AppCard>
                ))
              ) : (
                <EmptyState description="No hay diagnósticos visibles." title="Sin diagnósticos" />
              )}
            </Section>
            <Section title="Resúmenes de egreso">
              {dischargeSummaries.length ? dischargeSummaries.map((item) => <AppCard key={item.id} style={styles.card}><Text style={styles.itemTitle}>Egreso firmado · versión {item.version}</Text><Detail label="Evolución" value={item.hospital_course} /><Detail label="Diagnósticos de egreso" value={item.discharge_diagnoses} /><Detail label="Condición al egreso" value={item.condition_at_discharge} /><Detail label="Tratamiento" value={item.treatment_at_discharge} /><Detail label="Recomendaciones" value={item.recommendations} /><Detail label="Signos de alarma" value={item.warning_signs} /><Detail label="Seguimiento" value={item.follow_up_plan} />{item.pending_results ? <Detail label="Resultados pendientes" value={item.pending_results} /> : null}</AppCard>) : <EmptyState description="Los documentos firmados de una hospitalización aparecerán aquí." title="Sin resúmenes de egreso" />}
            </Section>
          </>
        ) : (
          <EmptyState description="No hay expediente disponible." title="Sin expediente" />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ children, title }: { children: ReactNode; title: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
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
  card: { gap: 8 },
  content: { gap: 16, padding: 22, paddingBottom: 34 },
  detail: { gap: 3 },
  detailLabel: { color: colors.muted, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  detailValue: { color: colors.ink, fontSize: 14, lineHeight: 20 },
  itemTitle: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  meta: { color: colors.muted, fontSize: 13, marginTop: 6 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  section: { gap: 10 },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  title: { color: colors.ink, fontSize: 22, fontWeight: '900' },
});
