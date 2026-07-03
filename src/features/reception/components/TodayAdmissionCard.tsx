import { Pressable, StyleSheet, Text } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';
import { formatDateTime } from '@/core/utils/dateUtils';
import { visitDoctorName, visitPatientName } from '@/features/reception/services/receptionMappers';
import type { ReceptionVisit } from '@/features/reception/types/receptionAdmission.types';
import { VisitStatusBadge } from '@/features/reception/components/VisitStatusBadge';

export function TodayAdmissionCard({ onPress, visit }: { onPress?: () => void; visit: ReceptionVisit }) {
  return (
    <Pressable onPress={onPress}>
      <AppCard style={styles.card}>
        <VisitStatusBadge status={visit.status} />
        <Text style={styles.title}>{visitPatientName(visit)}</Text>
        <Text style={styles.meta}>Motivo: {visit.reason || 'No registrado'}</Text>
        <Text style={styles.meta}>Tipo: {visit.visit_type || 'No registrado'}</Text>
        <Text style={styles.meta}>Medico: {visitDoctorName(visit)}</Text>
        <Text style={styles.meta}>Llegada: {visit.arrival_time || formatDateTime(visit.creado_en ?? visit.created_at, 'Sin hora')}</Text>
      </AppCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: 7 },
  meta: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  title: { color: colors.ink, fontSize: 17, fontWeight: '900' },
});
