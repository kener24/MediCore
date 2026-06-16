import { StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';
import { formatDateTime } from '@/core/utils/dateUtils';
import { PriorityBadge } from '@/features/doctor/components/PriorityBadge';
import type { DoctorTriageInfo, DoctorVisitDetail } from '@/features/doctor/types/doctorPatient.types';

export function TriageSummaryCard({
  triage,
  visit,
}: {
  triage?: DoctorTriageInfo | null;
  visit?: Partial<DoctorVisitDetail> | null;
}) {
  if (!triage) {
    return (
      <AppCard>
        <Text style={styles.title}>Triaje</Text>
        <Text style={styles.empty}>
          {visit?.triage_completed ?? visit?.triaje_completado
            ? 'El triaje esta marcado como completado, pero el backend no devolvio el detalle.'
            : 'El triaje aun no esta registrado.'}
        </Text>
      </AppCard>
    );
  }

  return (
    <AppCard style={styles.card}>
      <Text style={styles.title}>Triaje</Text>
      <Info label="Queja principal" value={triage.chief_complaint ?? triage.motivo_consulta} />
      <Info label="Evaluacion inicial" value={triage.initial_assessment ?? triage.evaluacion_inicial} />
      <PriorityBadge value={triage.priority ?? triage.prioridad} />
      <Info label="Notas de enfermeria" value={triage.notes ?? triage.notas} />
      <Info label="Enfermera" value={triage.nurse_name ?? triage.enfermera_nombre} />
      <Info label="Fecha" value={formatDateTime(triage.created_at ?? triage.creado_en)} />
    </AppCard>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.info}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || 'No indicado'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  empty: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 8 },
  info: { gap: 3 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: colors.ink, fontSize: 17, fontWeight: '900' },
  value: { color: colors.ink, fontSize: 14, lineHeight: 20 },
});
