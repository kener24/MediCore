import { StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';
import type { DoctorMedicalOrder } from '@/features/doctor/types/doctorMedicalOrder.types';

export function MedicalOrderPreviewCard({ items }: { items: DoctorMedicalOrder[] }) {
  return (
    <AppCard style={styles.card}>
      <Text style={styles.title}>Órdenes médicas creadas</Text>
      {items.length ? (
        items.map((item, index) => (
          <View key={item.id ?? index} style={styles.item}>
            <Text style={styles.itemTitle}>{item.order_type ?? 'Orden médica'}</Text>
            <Text style={styles.meta}>{item.description ?? 'Sin descripción'}</Text>
            <Text style={styles.meta}>Prioridad: {item.priority ?? 'normal'}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.empty}>No hay órdenes médicas registradas.</Text>
      )}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  empty: { color: colors.muted, fontSize: 14 },
  item: { backgroundColor: colors.surfaceMuted, borderRadius: 12, gap: 4, padding: 10 },
  itemTitle: { color: colors.ink, fontSize: 14, fontWeight: '900', textTransform: 'capitalize' },
  meta: { color: colors.muted, fontSize: 13 },
  title: { color: colors.ink, fontSize: 17, fontWeight: '900' },
});
