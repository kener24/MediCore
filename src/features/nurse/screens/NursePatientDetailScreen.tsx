import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { VitalSignsSummary } from '@/features/nurse/components/NurseCards';
import { getLatestVitalSigns, getNursePatientDetail, startTriage } from '@/features/nurse/services/nurseApi';
import type { NursePatientSummary, NurseVitalSigns } from '@/features/nurse/types/nurse.types';

export function NursePatientDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const visitId = route.params?.visitId;
  const initialPatient = route.params?.patient as NursePatientSummary | undefined;
  const [patient, setPatient] = useState<NursePatientSummary | null>(initialPatient ?? null);
  const [vitalSigns, setVitalSigns] = useState<NurseVitalSigns | null>(null);
  const [loading, setLoading] = useState(!initialPatient);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!visitId) {
      setError('No se encontró la visita del paciente.');
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const [detail, vitals] = await Promise.all([
        getNursePatientDetail(visitId).catch(() => initialPatient ?? null),
        getLatestVitalSigns(visitId).catch(() => null),
      ]);
      if (detail) setPatient(detail);
      setVitalSigns(vitals);
    } catch {
      setError('No se pudo cargar el detalle del paciente.');
    } finally {
      setLoading(false);
    }
  }, [initialPatient, visitId]);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  async function handleStart() {
    if (!visitId) {
      Alert.alert('Visita no encontrada', 'No se encontró la visita del paciente.');
      return;
    }
    if (starting) return;
    try {
      setStarting(true);
      const updated = await startTriage(visitId);
      setPatient(updated);
      Alert.alert('Triaje iniciado', 'Puedes registrar signos vitales y completar la evaluación.');
    } catch {
      Alert.alert('Triaje', 'No se pudo iniciar el triaje en este momento.');
    } finally {
      setStarting(false);
    }
  }

  if (loading) return <LoadingState label="Cargando paciente..." />;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeader icon="account-heart-outline" subtitle="Detalle básico para evaluación inicial." title="Paciente en triaje" />
        {error ? <ErrorState message={error} onRetry={load} title="Detalle no disponible" /> : null}
        <AppCard style={styles.card}>
          <Text style={styles.name}>{patient?.name ?? 'Paciente sin nombre'}</Text>
          <Text style={styles.meta}>{[patient?.age, patient?.gender, patient?.document].filter(Boolean).join(' · ') || 'Datos básicos pendientes'}</Text>
          <View style={styles.divider} />
          <Text style={styles.label}>Motivo</Text>
          <Text style={styles.body}>{patient?.reason || 'Sin motivo registrado.'}</Text>
          <Text style={styles.label}>Teléfono</Text>
          <Text style={styles.body}>{patient?.phone || 'No registrado'}</Text>
        </AppCard>
        <VitalSignsSummary vitalSigns={vitalSigns} />
        <AppButton disabled={!visitId || starting} label="Iniciar triaje" loading={starting} onPress={handleStart} />
        <AppButton disabled={!visitId} label="Registrar signos vitales" onPress={() => navigation.navigate('NurseVitalSignsForm', { patient, visitId })} variant="secondary" />
        <AppButton disabled={!visitId} label="Completar triaje" onPress={() => navigation.navigate('NurseTriageForm', { patient, visitId, vitalSigns })} variant="secondary" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 4,
  },
  card: {
    gap: 6,
  },
  content: {
    gap: 14,
    padding: 18,
    paddingBottom: 110,
  },
  divider: {
    backgroundColor: colors.border,
    height: 1,
    marginVertical: 10,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 8,
    textTransform: 'uppercase',
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
  },
  name: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '900',
  },
  safe: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
