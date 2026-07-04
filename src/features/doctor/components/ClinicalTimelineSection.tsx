import { StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';
import { formatDate } from '@/core/utils/dateUtils';
import type { DoctorPatientMedicalSummary } from '@/features/doctor/types/doctorPatient.types';

type TimelineItem = {
  date?: string;
  kind: string;
  subtitle?: string;
  title: string;
};

export function ClinicalTimelineSection({
  medicalSummary,
}: {
  medicalSummary?: DoctorPatientMedicalSummary | null;
}) {
  const items = buildTimeline(medicalSummary).slice(0, 8);

  return (
    <AppCard style={styles.card}>
      <Text style={styles.title}>Timeline clínico</Text>
      {items.length ? (
        items.map((item, index) => (
          <View key={`${item.kind}-${item.title}-${index}`} style={styles.item}>
            <View style={styles.dot} />
            <View style={styles.body}>
              <Text style={styles.kind}>{item.kind} - {formatDate(item.date)}</Text>
              <Text style={styles.itemTitle}>{item.title}</Text>
              {item.subtitle ? <Text style={styles.subtitle}>{item.subtitle}</Text> : null}
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.empty}>Sin eventos clínicos recientes.</Text>
      )}
    </AppCard>
  );
}

function buildTimeline(summary?: DoctorPatientMedicalSummary | null): TimelineItem[] {
  const diagnoses = (summary?.last_diagnoses ?? []).map((item) => ({
    date: item.date ?? item.fecha,
    kind: 'Diagnóstico',
    subtitle: item.doctor_name,
    title: item.diagnosis ?? item.diagnostico ?? 'Diagnóstico no indicado',
  }));
  const prescriptions = (summary?.last_prescriptions ?? []).map((item) => ({
    date: item.date ?? item.fecha,
    kind: 'Receta',
    subtitle: item.doctor_name,
    title: item.summary ?? item.resumen ?? 'Receta sin resumen',
  }));
  const consultations = (summary?.last_consultations ?? []).map((item) => ({
    date: item.date ?? item.fecha,
    kind: 'Consulta',
    subtitle: item.doctor_name,
    title: item.reason ?? item.motivo ?? 'Consulta sin motivo indicado',
  }));

  return [...diagnoses, ...prescriptions, ...consultations].sort((a, b) => {
    const left = a.date ? new Date(a.date).getTime() : 0;
    const right = b.date ? new Date(b.date).getTime() : 0;
    return right - left;
  });
}

const styles = StyleSheet.create({
  body: { flex: 1, gap: 3 },
  card: { gap: 12 },
  dot: { backgroundColor: colors.primary, borderRadius: 999, height: 10, marginTop: 5, width: 10 },
  empty: { color: colors.muted, fontSize: 13 },
  item: { flexDirection: 'row', gap: 10 },
  itemTitle: { color: colors.ink, fontSize: 14, fontWeight: '900', lineHeight: 19 },
  kind: { color: colors.primaryDark, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  subtitle: { color: colors.muted, fontSize: 12 },
  title: { color: colors.ink, fontSize: 17, fontWeight: '900' },
});
