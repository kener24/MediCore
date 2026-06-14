import { StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';

export type ProfileInfoItem = {
  label: string;
  value?: string | number | null;
};

export function ProfileInfoCard({ items, title }: { items: ProfileInfoItem[]; title: string }) {
  return (
    <AppCard style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {items.map((item) => (
        <View key={item.label} style={styles.row}>
          <Text style={styles.label}>{item.label}</Text>
          <Text style={styles.value}>{item.value || 'No indicado'}</Text>
        </View>
      ))}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 0,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  row: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: 4,
    paddingVertical: 11,
  },
  title: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 4,
  },
  value: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 21,
  },
});
