import { StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { colors } from '@/core/theme/colors';

interface DashboardSectionProps {
  children: React.ReactNode;
  emptyDescription: string;
  emptyTitle: string;
  isEmpty: boolean;
  title: string;
}

export function DashboardSection({
  children,
  emptyDescription,
  emptyTitle,
  isEmpty,
  title,
}: DashboardSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      {isEmpty ? <EmptyState description={emptyDescription} title={emptyTitle} /> : children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  title: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
});
