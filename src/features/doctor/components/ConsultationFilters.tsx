import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppInput } from '@/components/AppInput';
import { colors } from '@/core/theme/colors';

export type ConsultationQuickFilter = 'today' | 'in_progress' | 'completed' | 'draft' | 'all';

const quickFilters: { label: string; value: ConsultationQuickFilter }[] = [
  { label: 'Hoy', value: 'today' },
  { label: 'En progreso', value: 'in_progress' },
  { label: 'Finalizadas', value: 'completed' },
  { label: 'Borradores', value: 'draft' },
  { label: 'Todas', value: 'all' },
];

export function ConsultationFilters({
  date,
  filter,
  onChangeDate,
  onChangeFilter,
  onChangeSearch,
  search,
}: {
  date: string;
  filter: ConsultationQuickFilter;
  onChangeDate: (value: string) => void;
  onChangeFilter: (value: ConsultationQuickFilter) => void;
  onChangeSearch: (value: string) => void;
  search: string;
}) {
  return (
    <View style={styles.wrapper}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.filters}>
          {quickFilters.map((item) => (
            <Pressable
              key={item.value}
              onPress={() => onChangeFilter(item.value)}
              style={[styles.chip, filter === item.value && styles.chipActive]}>
              <Text style={[styles.chipText, filter === item.value && styles.chipTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <AppInput
        autoCapitalize="words"
        icon="magnify"
        label="Buscar paciente"
        onChangeText={onChangeSearch}
        placeholder="Nombre, identidad o motivo"
        value={search}
      />
      <AppInput
        icon="calendar"
        keyboardType="numbers-and-punctuation"
        label="Fecha"
        onChangeText={onChangeDate}
        placeholder="YYYY-MM-DD"
        value={date}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  chipTextActive: { color: colors.white },
  filters: { flexDirection: 'row', gap: 8 },
  wrapper: { gap: 12 },
});
