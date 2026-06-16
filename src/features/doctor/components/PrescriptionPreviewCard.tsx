import { StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';
import type { DoctorPrescription } from '@/features/doctor/types/doctorPrescription.types';

export function PrescriptionPreviewCard({ items }: { items: DoctorPrescription[] }) {
  return (
    <AppCard style={styles.card}>
      <Text style={styles.title}>Recetas creadas</Text>
      {items.length ? (
        items.map((item, index) => (
          <View key={item.id ?? index} style={styles.item}>
            <Text style={styles.itemTitle}>Receta #{item.id ?? index + 1}</Text>
            <Text style={styles.meta}>{item.medications?.length ?? 0} medicamento(s)</Text>
            {item.general_instructions ? <Text style={styles.meta}>{item.general_instructions}</Text> : null}
          </View>
        ))
      ) : (
        <Text style={styles.empty}>No hay recetas registradas.</Text>
      )}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  empty: { color: colors.muted, fontSize: 14 },
  item: { backgroundColor: colors.surfaceMuted, borderRadius: 12, gap: 4, padding: 10 },
  itemTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  meta: { color: colors.muted, fontSize: 13 },
  title: { color: colors.ink, fontSize: 17, fontWeight: '900' },
});
