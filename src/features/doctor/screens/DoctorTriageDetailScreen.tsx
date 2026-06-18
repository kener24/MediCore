import { useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { DoctorHeader } from '@/features/doctor/components/DoctorHeader';
import { TriageSummaryCard } from '@/features/doctor/components/TriageSummaryCard';
import { VisitInfoCard } from '@/features/doctor/components/VisitInfoCard';
import { VitalSignsCard } from '@/features/doctor/components/VitalSignsCard';
import {
  getVisitDetail,
  getVisitTriage,
  getVisitVitalSigns,
} from '@/features/doctor/services/doctorPatientService';
import type {
  DoctorTriageInfo,
  DoctorVisitDetail,
  DoctorVitalSigns,
} from '@/features/doctor/types/doctorPatient.types';
import type { WaitingRoomPatient } from '@/features/doctor/types/doctorWaitingRoom.types';

type RouteParams = {
  item?: WaitingRoomPatient;
  triage?: DoctorTriageInfo | null;
  visit?: Partial<DoctorVisitDetail> | null;
  visitId?: number | null;
  vitalSigns?: DoctorVitalSigns | null;
};

export function DoctorTriageDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = (route.params ?? {}) as RouteParams;
  const resolvedVisitId = params.visitId ?? params.visit?.id ?? params.item?.visit_id ?? params.item?.visita_id ?? params.item?.id;

  const [visit, setVisit] = useState<Partial<DoctorVisitDetail> | null>(params.visit ?? buildVisitFromItem(params.item));
  const [vitalSigns, setVitalSigns] = useState<DoctorVitalSigns | null>(
    params.vitalSigns ?? (params.item?.vital_signs as DoctorVitalSigns | undefined) ?? null,
  );
  const [triage, setTriage] = useState<DoctorTriageInfo | null>(params.triage ?? null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(resolvedVisitId && (!params.triage || !params.vitalSigns)));

  const load = useCallback(async () => {
    if (!resolvedVisitId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [visitData, vitalsData, triageData] = await Promise.all([
        getVisitDetail(resolvedVisitId).catch(() => null),
        getVisitVitalSigns(resolvedVisitId).catch(() => null),
        getVisitTriage(resolvedVisitId).catch(() => null),
      ]);
      setVisit(visitData ?? params.visit ?? buildVisitFromItem(params.item));
      setTriage(triageData ?? params.triage ?? null);
      setVitalSigns(vitalsData ?? triageData?.vital_signs ?? params.vitalSigns ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el triaje.');
    } finally {
      setLoading(false);
    }
  }, [params.item, params.triage, params.visit, params.vitalSigns, resolvedVisitId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState label="Cargando triaje..." />;
  if (error) return <ErrorState message={error} onRetry={load} title="No se pudo cargar el triaje" />;

  const hasData = Boolean(visit || triage || vitalSigns);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <DoctorHeader title="Triaje y signos vitales" />
        {hasData ? (
          <>
            <VisitInfoCard visit={visit} />
            <VitalSignsCard vitalSigns={vitalSigns} />
            <TriageSummaryCard triage={triage} visit={visit} />
          </>
        ) : (
          <EmptyState
            description="El detalle de triaje aún no está disponible para esta visita."
            title="Sin datos de triaje"
          />
        )}
        <AppButton label="Volver" onPress={() => navigation.goBack()} variant="secondary" />
      </ScrollView>
    </SafeAreaView>
  );
}

function buildVisitFromItem(item?: WaitingRoomPatient): Partial<DoctorVisitDetail> | null {
  if (!item) return null;
  return {
    arrived_at: item.arrived_at ?? item.llegada_en,
    id: item.visit_id ?? item.visita_id ?? item.id,
    patient_id: item.patient_id ?? item.paciente_id,
    patient_name: item.patient_name ?? item.paciente_nombre,
    priority: item.priority ?? item.prioridad,
    reason: item.reason ?? item.motivo,
    status: item.status ?? item.estado,
    triage_completed: item.triage_completed ?? item.triaje_completado,
    visit_type: item.visit_type ?? item.tipo_visita,
  };
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 22, paddingBottom: 118 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
});
