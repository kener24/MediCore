import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/core/theme/colors';
import { formatDate, toISODate } from '@/core/utils/dateUtils';

type AppDateInputProps = {
  label: string;
  maximumDate?: Date;
  minimumDate?: Date;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
};

export function AppDateInput({ label, maximumDate, minimumDate, onChange, placeholder = 'Seleccionar fecha', value }: AppDateInputProps) {
  const [open, setOpen] = useState(false);
  const dateValue = useMemo(() => parseISODate(value) ?? minimumDate ?? new Date(), [minimumDate, value]);
  const displayValue = value ? formatDate(value) : placeholder;

  function handleChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS !== 'ios') setOpen(false);
    if (event.type === 'dismissed' || !selectedDate) return;
    onChange(toISODate(selectedDate));
  }

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <Pressable onPress={() => setOpen(true)} style={styles.shell}>
        <MaterialCommunityIcons color={colors.muted} name="calendar" size={20} />
        <Text style={[styles.value, !value && styles.placeholder]}>{displayValue}</Text>
        <MaterialCommunityIcons color={colors.muted} name="chevron-down" size={22} />
      </Pressable>
      {open ? (
        <DateTimePicker
          display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          mode="date"
          onChange={handleChange}
          value={dateValue}
        />
      ) : null}
    </View>
  );
}

function parseISODate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  label: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  placeholder: { color: '#98a2b3' },
  shell: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 54,
    paddingHorizontal: 14,
  },
  value: { color: colors.ink, flex: 1, fontSize: 16, paddingVertical: 12 },
});
