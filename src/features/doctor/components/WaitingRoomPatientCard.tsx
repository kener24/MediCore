import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';
import { ConsultationStatusBadge } from '@/features/doctor/components/ConsultationStatusBadge';
import { PriorityBadge } from '@/features/doctor/components/PriorityBadge';
import type { WaitingRoomPatient } from '@/features/doctor/types/doctorWaitingRoom.types';
import { formatTime } from '@/features/patient/utils/formatters';

export function WaitingRoomPatientCard({
  item,
  loading,
  onStartConsultation,
  onView,
}: {
  item: WaitingRoomPatient;
  loading?: boolean;
  onStartConsultation?: () => void;
  onView?: () => void;
}) {
  const name = item.patient_name ?? item.paciente_nombre ?? item.patient?.full_name ?? item.patient?.nombre_completo ?? 'Paciente';
  const visitId = item.visit_id ?? item.visita_id ?? item.id;
  const demographic = [item.age ?? item.edad ? `${item.age ?? item.edad} años` : null, item.gender ?? item.genero]
    .filter(Boolean)
    .join(' - ');

  return (
    <Pressable disabled={loading} onPress={onView}>
      <AppCard style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>{name}</Text>
          <PriorityBadge value={item.priority ?? item.prioridad} />
        </View>
        {demographic ? <Text style={styles.meta}>{demographic}</Text> : null}
        <Text style={styles.reason}>{item.reason ?? item.motivo ?? 'Motivo no indicado'}</Text>
        <View style={styles.metaRow}>
          <ConsultationStatusBadge status={item.status ?? item.estado} />
          <Text style={styles.meta}>Llegada: {formatTime(item.arrived_at ?? item.llegada_en)}</Text>
        </View>
        <Text style={styles.meta}>
          Triaje: {item.triage_completed ?? item.triaje_completado ? 'completado' : 'pendiente'} - Visita #{visitId}
          {item.waiting_time_minutes ? ` - Espera ${item.waiting_time_minutes} min` : ''}
        </Text>
        {item.vital_signs ? (
          <Text style={styles.vitals}>
            Temp {item.vital_signs.temperature || '-'} - PA {item.vital_signs.blood_pressure || '-'} - FC{' '}
            {item.vital_signs.heart_rate || '-'} - Sat {item.vital_signs.oxygen_saturation || '-'}%
          </Text>
        ) : null}
        <View style={styles.actions}>
          <AppButton disabled={loading} label="Ver paciente" onPress={onView} style={styles.button} variant="secondary" />
          <AppButton label={loading ? 'Iniciando...' : 'Iniciar consulta'} loading={loading} onPress={onStartConsultation} style={styles.button} />
        </View>
      </AppCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 8, marginTop: 6 },
  button: { flex: 1, height: 46 },
  card: { gap: 8 },
  header: { alignItems: 'flex-start', flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  meta: { color: colors.muted, fontSize: 12 },
  metaRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  reason: { color: colors.ink, fontSize: 14, lineHeight: 20 },
  title: { color: colors.ink, flex: 1, fontSize: 17, fontWeight: '900' },
  vitals: { color: colors.primaryDark, fontSize: 12, fontWeight: '900' },
});
