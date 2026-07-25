import { Pressable, StyleSheet, Text } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';
import type { DoctorMedicalOrder } from '@/features/doctor/types/doctorMedicalOrder.types';

export function MedicalOrderPreviewCard({
  items,
  onPressItem,
}: {
  items: DoctorMedicalOrder[];
  onPressItem?: (item: DoctorMedicalOrder) => void;
}) {
  return (
    <AppCard style={styles.card}>
      <Text style={styles.title}>Órdenes médicas creadas</Text>
      {items.length ? (
        items.map((item, index) => (
          <Pressable
            disabled={!onPressItem || !item.id}
            key={item.id ?? index}
            onPress={() => onPressItem?.(item)}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
            <Text style={styles.itemTitle}>{item.order_number ?? item.title ?? item.order_type ?? 'Orden médica'}</Text>
            <Text style={styles.meta}>{item.description ?? 'Sin descripción'}</Text>
            <Text style={styles.meta}>Prioridad: {item.priority ?? 'normal'}</Text>
            <Text style={styles.meta}>Estado: {item.status ?? 'pendiente'}</Text>
          </Pressable>
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
  pressed: { opacity: 0.75 },
  title: { color: colors.ink, fontSize: 17, fontWeight: '900' },
});
