import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppInput } from '@/components/AppInput';
import { colors } from '@/core/theme/colors';

export function SearchAndFilters<T extends string>({
  filters,
  onFilterChange,
  onSearchChange,
  search,
  selectedFilter,
  searchLabel = 'Buscar',
}: {
  filters: { label: string; value: T }[];
  onFilterChange: (filter: T) => void;
  onSearchChange: (search: string) => void;
  search: string;
  selectedFilter: T;
  searchLabel?: string;
}) {
  return (
    <View style={styles.wrap}>
      <AppInput icon="magnify" label={searchLabel} onChangeText={onSearchChange} value={search} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.filters}>
          {filters.map((item) => (
            <Pressable key={item.value} onPress={() => onFilterChange(item.value)} style={[styles.filter, selectedFilter === item.value && styles.filterActive]}>
              <Text style={[styles.filterText, selectedFilter === item.value && styles.filterTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

export function LocalDataNotice({ label }: { label?: string | null }) {
  if (!label) return null;
  return (
    <View style={styles.notice}>
      <Text style={styles.noticeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  filter: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  filterActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  filterTextActive: {
    color: colors.white,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
  },
  notice: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  noticeText: {
    color: '#9a3412',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  wrap: {
    gap: 10,
  },
});
