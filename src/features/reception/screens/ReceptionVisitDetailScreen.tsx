import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { VisitStatusBadge } from '@/features/reception/components/VisitStatusBadge';
import { cancelAdmission, getVisitDetail, sendToDoctor, sendToTriage } from '@/features/reception/services/receptionAdmissionService';
import { visitDoctorName, visitPatientName } from '@/features/reception/services/receptionMappers';
import type { ReceptionVisit } from '@/features/reception/types/receptionAdmission.types';

export function ReceptionVisitDetailScreen() {
  const route = useRoute<any>();
  const visitId = Number(route.params?.visitId);
  const [visit, setVisit] = useState<ReceptionVisit | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setVisit(await getVisitDetail(visitId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la visita.');
    } finally {
      setLoading(false);
    }
  }, [visitId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function run(action: 'triage' | 'doctor' | 'cancel') {
    if (!visit?.id) return;
    try {
      setBusy(true);
      if (action === 'triage') setVisit(await sendToTriage(visit.id));
      if (action === 'doctor') setVisit(await sendToDoctor(visit.id));
      if (action === 'cancel') {
        const reason = 'Cancelada desde recepción móvil';
        setVisit(await cancelAdmission(visit.id, reason));
      }
      Alert.alert('Visita', 'Estado actualizado correctamente.');
    } catch (err) {
      Alert.alert('Visita', err instanceof Error ? err.message : 'Esta acción no está disponible por el momento.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingState label="Cargando visita..." />;
  const closed = ['cancelled', 'completed', 'paid'].includes(String(visit?.status));

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeader icon="clipboard-text-outline" subtitle="Información operativa de recepción." title="Detalle de visita" />
        {error ? <ErrorState message={error} onRetry={() => void load()} title="No se pudo cargar" /> : null}
        {!error && !visit ? <EmptyState title="Visita no disponible" /> : null}
        {visit ? (
          <>
            <AppCard style={styles.card}>
              <VisitStatusBadge status={visit.status} />
              <Text style={styles.title}>{visitPatientName(visit)}</Text>
              <Info label="Motivo" value={visit.reason || 'No registrado'} />
              <Info label="Tipo" value={visit.visit_type || 'No registrado'} />
              <Info label="Prioridad" value={visit.priority || 'normal'} />
              <Info label="Médico" value={visitDoctorName(visit)} />
              <Info label="Llegada" value={visit.arrival_time || visit.creado_en || 'Sin hora'} />
              <Info label="Cita relacionada" value={String(visit.appointment ?? visit.appointment_id ?? 'Sin cita')} />
            </AppCard>
            {!closed ? (
              <View style={styles.actions}>
                <AppButton disabled={busy} label="Enviar a triaje" onPress={() => void run('triage')} />
                <AppButton disabled={busy} label="Enviar a médico" onPress={() => void run('doctor')} variant="secondary" />
                <AppButton disabled={busy} label="Cancelar admisión" onPress={() => void run('cancel')} variant="danger" />
              </View>
            ) : null}
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
  actions: { gap: 10 },
  card: { gap: 7 },
  content: { gap: 14, padding: 18, paddingBottom: 120 },
  meta: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  safe: { backgroundColor: colors.background, flex: 1 },
  title: { color: colors.ink, fontSize: 20, fontWeight: '900' },
});
