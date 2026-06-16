import { StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';
import type { DoctorClinicalConsumption } from '@/features/doctor/types/doctorClinicalConsumption.types';

export function ClinicalConsumptionCard({ items }: { items: DoctorClinicalConsumption[] }) {
  return (
    <AppCard style={styles.card}>
      <Text style={styles.title}>Consumos clínicos registrados</Text>
      {items.length ? (
        items.map((item, index) => (
          <View key={item.id ?? index} style={styles.item}>
            <Text style={styles.itemTitle}>{item.item_name ?? `Consumo #${item.id ?? index + 1}`}</Text>
            <Text style={styles.meta}>Cantidad: {item.quantity ?? 'No indicada'} {item.unit ?? ''}</Text>
            <Text style={styles.meta}>{item.billable === false ? 'No facturable' : 'Facturable'}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.empty}>No hay consumos clínicos registrados.</Text>
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
