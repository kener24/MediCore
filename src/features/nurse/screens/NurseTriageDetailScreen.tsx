import { useRoute } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { priorityLabel, VitalSignsSummary } from '@/features/nurse/components/NurseCards';
import { getTriageDetail } from '@/features/nurse/services/nurseApi';
import type { NurseTriage } from '@/features/nurse/types/nurse.types';

export function NurseTriageDetailScreen() {
  const route = useRoute<any>();
  const triageId = route.params?.triageId;
  const [triage, setTriage] = useState<NurseTriage | null>(route.params?.triage ?? null);
  const [loading, setLoading] = useState(!route.params?.triage && Boolean(triageId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!triageId) return;
    getTriageDetail(triageId)
      .then(setTriage)
      .catch(() => setError('El triaje aún no está registrado.'))
      .finally(() => setLoading(false));
  }, [triageId]);

  if (loading) return <LoadingState label="Cargando triaje..." />;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeader icon="clipboard-pulse-outline" subtitle={triage?.patient.name ?? 'Detalle de triaje'} title="Detalle de triaje" />
        {error || !triage ? <ErrorState message={error ?? 'El triaje aún no está registrado.'} title="Sin triaje" /> : null}
        {triage ? (
          <>
            <AppCard style={styles.card}>
              <Text style={styles.label}>Paciente</Text>
              <Text style={styles.value}>{triage.patient.name}</Text>
              <Text style={styles.label}>Prioridad</Text>
              <Text style={styles.value}>{priorityLabel(triage.priority)}</Text>
              <Text style={styles.label}>Queja principal</Text>
              <Text style={styles.body}>{triage.chiefComplaint || 'No registrada'}</Text>
              <Text style={styles.label}>Evaluación inicial</Text>
              <Text style={styles.body}>{triage.initialAssessment || 'No registrada'}</Text>
              <Text style={styles.label}>Notas</Text>
              <Text style={styles.body}>{triage.notes || 'Sin notas adicionales'}</Text>
            </AppCard>
            <VitalSignsSummary vitalSigns={triage.vitalSigns} />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  card: {
    gap: 5,
  },
  content: {
    gap: 14,
    padding: 18,
    paddingBottom: 110,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 8,
    textTransform: 'uppercase',
  },
  safe: {
    backgroundColor: colors.background,
    flex: 1,
  },
  value: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
});
