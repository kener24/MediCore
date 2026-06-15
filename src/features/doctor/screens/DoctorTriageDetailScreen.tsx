import { useRoute } from '@react-navigation/native';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppCard } from '@/components/AppCard';
import { EmptyState } from '@/components/EmptyState';
import { colors } from '@/core/theme/colors';
import { DoctorHeader } from '@/features/doctor/components/DoctorHeader';
import { PriorityBadge } from '@/features/doctor/components/PriorityBadge';
import { VitalSignsCard } from '@/features/doctor/components/VitalSignsCard';
import type { DoctorVitalSigns } from '@/features/doctor/types/doctorConsultation.types';
import type { WaitingRoomPatient } from '@/features/doctor/types/doctorWaitingRoom.types';

export function DoctorTriageDetailScreen() {
  const route = useRoute();
  const params = (route.params ?? {}) as {
    item?: WaitingRoomPatient;
    visit?: Record<string, unknown> | null;
    vitalSigns?: DoctorVitalSigns | null;
  };
  const item = params.item;
  const visit = params.visit;
  const vitalSigns = params.vitalSigns ?? item?.vital_signs;
  const priority = String(visit?.priority ?? visit?.prioridad ?? item?.priority ?? item?.prioridad ?? 'Normal');
  const notes = String(visit?.triage_notes ?? visit?.notes ?? item?.vital_signs?.notes ?? '');

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <DoctorHeader title="Triaje y signos vitales" />
        <AppCard style={styles.card}>
          <Text style={styles.title}>Prioridad</Text>
          <PriorityBadge value={priority} />
          <Text style={styles.meta}>
            Estado de triaje: {item?.triage_completed ?? item?.triaje_completado ? 'completado' : 'pendiente'}
          </Text>
        </AppCard>
        <VitalSignsCard vitalSigns={vitalSigns} />
        {notes ? (
          <AppCard>
            <Text style={styles.title}>Notas de enfermería</Text>
            <Text style={styles.notes}>{notes}</Text>
          </AppCard>
        ) : (
          <EmptyState description="El backend no devolvió evaluación inicial adicional." title="Sin notas de triaje" />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  content: { gap: 14, padding: 22, paddingBottom: 34 },
  meta: { color: colors.muted, fontSize: 13 },
  notes: { color: colors.ink, fontSize: 14, lineHeight: 21, marginTop: 8 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  title: { color: colors.ink, fontSize: 17, fontWeight: '900' },
});
