import { StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';
import { formatDate } from '@/core/utils/dateUtils';
import type { DoctorPatientMedicalSummary } from '@/features/doctor/types/doctorPatient.types';

export function RecentClinicalInfoSection({
  medicalSummary,
}: {
  medicalSummary?: DoctorPatientMedicalSummary | null;
}) {
  return (
    <AppCard style={styles.card}>
      <Text style={styles.title}>Informacion clinica reciente</Text>
      <Group
        empty="No hay diagnosticos recientes."
        items={(medicalSummary?.last_diagnoses ?? []).slice(0, 3).map((item) => ({
          id: item.id,
          subtitle: [formatDate(item.date ?? item.fecha), item.doctor_name].filter(Boolean).join(' - '),
          title: item.diagnosis ?? item.diagnostico ?? 'Diagnostico no indicado',
        }))}
        title="Ultimos diagnosticos"
      />
      <Group
        empty="No hay recetas recientes."
        items={(medicalSummary?.last_prescriptions ?? []).slice(0, 3).map((item) => ({
          id: item.id,
          subtitle: [formatDate(item.date ?? item.fecha), item.doctor_name].filter(Boolean).join(' - '),
          title: item.summary ?? item.resumen ?? 'Receta sin resumen',
        }))}
        title="Ultimas recetas"
      />
      <Group
        empty="No hay consultas recientes."
        items={(medicalSummary?.last_consultations ?? []).slice(0, 3).map((item) => ({
          id: item.id,
          subtitle: [formatDate(item.date ?? item.fecha), item.doctor_name].filter(Boolean).join(' - '),
          title: item.reason ?? item.motivo ?? 'Consulta sin motivo indicado',
        }))}
        title="Ultimas consultas"
      />
    </AppCard>
  );
}

function Group({
  empty,
  items,
  title,
}: {
  empty: string;
  items: { id?: number; subtitle: string; title: string }[];
  title: string;
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      {items.length ? (
        items.map((item, index) => (
          <View key={item.id ?? index} style={styles.item}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            {item.subtitle ? <Text style={styles.itemSubtitle}>{item.subtitle}</Text> : null}
          </View>
        ))
      ) : (
        <Text style={styles.empty}>{empty}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14 },
  empty: { color: colors.muted, fontSize: 13 },
  group: { gap: 8 },
  groupTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  item: { backgroundColor: colors.surfaceMuted, borderRadius: 12, gap: 3, padding: 10 },
  itemSubtitle: { color: colors.muted, fontSize: 12 },
  itemTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  title: { color: colors.ink, fontSize: 17, fontWeight: '900' },
});
