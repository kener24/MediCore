import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { patientIdentity, patientName, patientPhone } from '@/features/reception/services/receptionMappers';
import { getPatientDetail } from '@/features/reception/services/receptionPatientService';
import type { ReceptionPatient } from '@/features/reception/types/receptionPatient.types';

export function ReceptionPatientDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const patientId = Number(route.params?.patientId);
  const [patient, setPatient] = useState<ReceptionPatient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setPatient(await getPatientDetail(patientId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el paciente.');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading) return <LoadingState label="Cargando paciente..." />;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeader icon="account-outline" subtitle="Información básica para recepción." title="Paciente" />
        {error ? <ErrorState message={error} onRetry={() => void load()} title="No se pudo cargar" /> : null}
        {!error && !patient ? <EmptyState title="Paciente no disponible" /> : null}
        {patient ? (
          <>
            <AppCard style={styles.card}>
              <Text style={styles.title}>{patientName(patient)}</Text>
              <Info label="Identidad" value={patientIdentity(patient)} />
              <Info label="Teléfono" value={patientPhone(patient)} />
              <Info label="Edad" value={String(patient.age ?? patient.edad ?? 'No registrada')} />
              <Info label="Sexo" value={patient.gender ?? patient.genero ?? 'No registrado'} />
              <Info label="Dirección" value={patient.address ?? patient.direccion ?? 'No registrada'} />
              <Info label="Código" value={patient.patient_code ?? patient.codigo_paciente ?? 'Sin código'} />
              {patient.allergies || patient.alergias ? <Info label="Alergias" value={patient.allergies ?? patient.alergias ?? ''} /> : null}
            </AppCard>
            <AppButton label="Crear admisión" onPress={() => navigation.navigate('ReceptionCreateAdmission', { patientId: patient.id })} />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <Text style={styles.meta}>{label}: {value}</Text>;
}

const styles = StyleSheet.create({
  card: { gap: 7 },
  content: { gap: 14, padding: 18, paddingBottom: 120 },
  meta: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  safe: { backgroundColor: colors.background, flex: 1 },
  title: { color: colors.ink, fontSize: 20, fontWeight: '900' },
});
