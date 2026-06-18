import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';
import { ConsultationStatusBadge } from '@/features/doctor/components/ConsultationStatusBadge';
import type { DoctorConsultation } from '@/features/doctor/types/doctorConsultation.types';

export function ConsultationCard({
  item,
  onContinue,
  onOpen,
  onSummary,
}: {
  item: DoctorConsultation;
  onContinue: () => void;
  onOpen: () => void;
  onSummary: () => void;
}) {
  const completed = isCompleted(item.status);
  const title = patientName(item);
  const reason = item.chief_complaint || item.reason || item.diagnosis_text || 'Consulta médica';
  return (
    <Pressable onPress={onOpen}>
      <AppCard style={styles.card}>
        <View style={styles.header}>
          <View style={styles.titleWrap}>
            <Text numberOfLines={1} style={styles.title}>{title}</Text>
            <Text numberOfLines={2} style={styles.reason}>{reason}</Text>
          </View>
          <ConsultationStatusBadge status={item.status} />
        </View>
        <View style={styles.metaRow}>
          <Meta icon="calendar" value={formatDate(item.consultation_date || item.created_at || item.creado_en)} />
          <Meta icon="clock-outline" value={formatTime(item.started_at || item.created_at || item.creado_en)} />
          {item.priority ? <Meta icon="alert-circle-outline" value={String(item.priority)} /> : null}
        </View>
        {item.diagnosis_text || item.preliminary_diagnosis ? (
          <Text numberOfLines={2} style={styles.diagnosis}>
            Diagnóstico: {item.diagnosis_text || item.preliminary_diagnosis}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <AppButton label="Ver detalle" onPress={onOpen} style={styles.actionButton} variant="secondary" />
          {completed ? (
            <AppButton label="Resumen" onPress={onSummary} style={styles.actionButton} />
          ) : (
            <AppButton label="Continuar" onPress={onContinue} style={styles.actionButton} />
          )}
        </View>
      </AppCard>
    </Pressable>
  );
}

export function patientName(item: DoctorConsultation) {
  const patient = asPatientRecord(item.patient);
  if (patient) {
    return patient.full_name || patient.nombre_completo || 'Paciente';
  }
  return item.patient_name || item.patient_nombre || 'Paciente';
}

export function consultationId(item: DoctorConsultation) {
  return item.id ?? item.consultation_id;
}

export function visitId(item: DoctorConsultation) {
  return item.visit_id ?? item.patient_visit ?? undefined;
}

export function patientId(item: DoctorConsultation) {
  if (typeof item.patient === 'number') return item.patient;
  const patient = asPatientRecord(item.patient);
  if (patient) return patient.id;
  return item.patient_id;
}

export function isCompleted(status?: string | null) {
  return ['completed', 'complete', 'finalizada', 'atendida', 'cerrada'].includes((status ?? '').toLowerCase());
}

function Meta({ icon, value }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; value: string }) {
  return (
    <View style={styles.meta}>
      <MaterialCommunityIcons color={colors.muted} name={icon} size={15} />
      <Text style={styles.metaText}>{value}</Text>
    </View>
  );
}

function asPatientRecord(value: DoctorConsultation['patient']) {
  return value && typeof value === 'object' ? value : null;
}

function formatDate(value?: string | null) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toLocaleDateString('es-HN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(value?: string | null) {
  if (!value) return 'Sin hora';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(11, 16) || 'Sin hora';
  return date.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  actionButton: { flex: 1, height: 46 },
  actions: { flexDirection: 'row', gap: 10 },
  card: { gap: 12 },
  diagnosis: { color: colors.ink, fontSize: 13, lineHeight: 19 },
  header: { alignItems: 'flex-start', flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  meta: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metaText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  reason: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 3 },
  title: { color: colors.ink, fontSize: 17, fontWeight: '900' },
  titleWrap: { flex: 1 },
});
