import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { formatDateTime } from '@/core/utils/dateUtils';
import {
  CurrentBedCard,
  HospitalizationEventCard,
  InpatientPatientCard,
  InpatientVitalSignsCard,
  NursingNoteCard,
  resolvePatientName,
} from '@/features/nurse/hospitalization/components/HospitalizationCards';
import { HospitalizationStatusBadge } from '@/features/nurse/hospitalization/components/HospitalizationBadges';
import { getHospitalizationDetail } from '@/features/nurse/hospitalization/services/nurseHospitalizationService';
import type { NurseHospitalizationDetail } from '@/features/nurse/hospitalization/types/nurseHospitalization.types';

export function NurseHospitalizationDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const hospitalizationId = Number(route.params?.hospitalizationId);
  const [detail, setDetail] = useState<NurseHospitalizationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setDetail(await getHospitalizationDetail(hospitalizationId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el internamiento.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hospitalizationId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading) return <LoadingState label="Cargando internamiento..." />;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}
        showsVerticalScrollIndicator={false}>
        <AppHeader icon="hospital-box-outline" subtitle="Detalle de internamiento y seguimiento de enfermería." title="Internamiento" />
        {error ? <ErrorState message={error} onRetry={() => void load()} title="No se pudo cargar el internamiento" /> : null}
        {!error && !detail ? <EmptyState description="El internamiento no está disponible." title="Sin información" /> : null}
        {detail ? (
          <>
            <InpatientPatientCard detail={detail} />
            <AppCard style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.sectionTitle}>Datos del internamiento</Text>
                <HospitalizationStatusBadge status={detail.status} />
              </View>
              <Text style={styles.title}>{resolvePatientName(detail)}</Text>
              <Text style={styles.description}>Motivo: {detail.reason || 'No registrado'}</Text>
              <Text style={styles.description}>Diagnóstico de ingreso: {detail.diagnosis_at_admission || 'No registrado'}</Text>
              <Text style={styles.description}>Médico responsable: {detail.responsible_doctor_name || 'No asignado'}</Text>
              <Text style={styles.description}>Ingreso: {formatDateTime(detail.admission_datetime)}</Text>
            </AppCard>
            <CurrentBedCard detail={detail} />
            <View style={styles.actions}>
              <AppButton label="Registrar signos" onPress={() => navigation.navigate('NurseInpatientVitalSignsForm', { hospitalizationId })} />
              <AppButton label="Agregar nota" onPress={() => navigation.navigate('NurseNursingNoteForm', { hospitalizationId })} variant="secondary" />
            </View>
            <SectionHeader onPress={() => navigation.navigate('NurseInpatientVitalSignsHistory', { hospitalizationId })} title="Signos vitales recientes" />
            {(detail.recent_vital_signs ?? []).slice(0, 3).map((item) => <InpatientVitalSignsCard item={item} key={item.id ?? `${item.recorded_at}`} />)}
            {(detail.recent_vital_signs ?? []).length === 0 ? <EmptyState description="No hay signos vitales hospitalarios registrados." title="Sin signos" /> : null}
            <SectionHeader onPress={() => navigation.navigate('NurseNursingNotesList', { hospitalizationId })} title="Notas de enfermería recientes" />
            {(detail.recent_nursing_notes ?? []).slice(0, 3).map((item) => <NursingNoteCard item={item} key={item.id ?? `${item.recorded_at}`} />)}
            {(detail.recent_nursing_notes ?? []).length === 0 ? <EmptyState description="No hay notas de enfermería registradas." title="Sin notas" /> : null}
            <SectionHeader onPress={() => navigation.navigate('NurseHospitalizationEvents', { hospitalizationId })} title="Eventos recientes" />
            {(detail.events ?? detail.recent_events ?? []).slice(0, 4).map((item) => <HospitalizationEventCard item={item} key={item.id ?? `${item.creado_en}`} />)}
            {(detail.events ?? detail.recent_events ?? []).length === 0 ? <EmptyState description="No hay eventos registrados." title="Sin eventos" /> : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ onPress, title }: { onPress: () => void; title: string }) {
  return (
    <View style={styles.rowBetween}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text onPress={onPress} style={styles.link}>Ver todo</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 10 },
  card: { gap: 10 },
  content: { gap: 14, padding: 18, paddingBottom: 118 },
  description: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  link: { color: colors.primary, fontSize: 13, fontWeight: '900' },
  rowBetween: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  safe: { backgroundColor: colors.background, flex: 1 },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: '900' },
  title: { color: colors.ink, fontSize: 16, fontWeight: '900' },
});
