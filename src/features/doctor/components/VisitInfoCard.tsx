import { StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';
import { formatDateTime } from '@/core/utils/dateUtils';
import { PriorityBadge } from '@/features/doctor/components/PriorityBadge';
import { VisitStatusBadge } from '@/features/doctor/components/VisitStatusBadge';
import type { DoctorVisitDetail } from '@/features/doctor/types/doctorPatient.types';

export function VisitInfoCard({ visit }: { visit?: Partial<DoctorVisitDetail> | null }) {
  const reason = visit?.reason ?? visit?.motivo;
  const type = visit?.visit_type ?? visit?.tipo_visita;
  const status = visit?.status ?? visit?.estado;
  const priority = visit?.priority ?? visit?.prioridad;
  const arrivedAt = visit?.arrived_at ?? visit?.llegada_en;

  return (
    <AppCard style={styles.card}>
      <Text style={styles.title}>Visita actual</Text>
      <Info label="Motivo" value={reason} />
      <Info label="Tipo de visita" value={type} />
      <View style={styles.row}>
        <PriorityBadge value={priority} />
        <VisitStatusBadge status={status} />
      </View>
      <Info label="Hora de llegada" value={arrivedAt ? formatDateTime(arrivedAt) : undefined} />
      <Info label="Cita asociada" value={visit?.appointment_id ? `#${visit.appointment_id}` : undefined} />
    </AppCard>
  );
}

function Info({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View style={styles.info}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || 'No indicado'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  info: { gap: 3 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  title: { color: colors.ink, fontSize: 17, fontWeight: '900' },
  value: { color: colors.ink, fontSize: 14, lineHeight: 20 },
});
