import { StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';

export function CashierStatsGrid({ stats }: { stats: { label: string; value: string }[] }) {
  return (
    <View style={styles.grid}>
      {stats.map((item) => (
        <AppCard key={item.label} style={styles.card}>
          <Text style={styles.value}>{item.value}</Text>
          <Text style={styles.label}>{item.label}</Text>
        </AppCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, gap: 4, minWidth: '45%' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  label: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  value: { color: colors.ink, fontSize: 19, fontWeight: '900' },
});
