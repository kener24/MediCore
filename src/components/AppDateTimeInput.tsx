import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/core/theme/colors';
import { formatDate, toISODate } from '@/core/utils/dateUtils';

type PickerMode = 'date' | 'time';

type AppDateTimeInputProps = {
  label: string;
  minimumDate?: Date;
  onChange: (value: string) => void;
  value: string;
};

export function AppDateTimeInput({ label, minimumDate, onChange, value }: AppDateTimeInputProps) {
  const [openMode, setOpenMode] = useState<PickerMode | null>(null);
  const dateValue = useMemo(() => parseDateTime(value) ?? minimumDate ?? new Date(), [minimumDate, value]);
  const displayDate = value ? formatDate(value.slice(0, 10)) : 'Seleccionar fecha';
  const displayTime = value && value.includes('T') ? value.slice(11, 16) : 'Seleccionar hora';

  function handleChange(event: DateTimePickerEvent, selectedDate?: Date) {
    const mode = openMode;
    if (Platform.OS !== 'ios') setOpenMode(null);
    if (event.type === 'dismissed' || !selectedDate || !mode) return;

    const next = new Date(dateValue);
    if (mode === 'date') {
      next.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    } else {
      next.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
    }
    onChange(formatDateTime(next));
  }

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Pressable onPress={() => setOpenMode('date')} style={styles.shell}>
          <MaterialCommunityIcons color={colors.muted} name="calendar" size={20} />
          <Text style={[styles.value, !value && styles.placeholder]}>{displayDate}</Text>
        </Pressable>
        <Pressable onPress={() => setOpenMode('time')} style={styles.shell}>
          <MaterialCommunityIcons color={colors.muted} name="clock-outline" size={20} />
          <Text style={[styles.value, !value && styles.placeholder]}>{displayTime}</Text>
        </Pressable>
      </View>
      {openMode ? (
        <DateTimePicker
          display={Platform.OS === 'ios' && openMode === 'date' ? 'inline' : 'default'}
          minimumDate={openMode === 'date' ? minimumDate : undefined}
          mode={openMode}
          onChange={handleChange}
          value={dateValue}
        />
      ) : null}
    </View>
  );
}

function parseDateTime(value: string) {
  if (!value) return null;
  const normalized = value.includes('T') ? value : `${value}T00:00`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateTime(value: Date) {
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  return `${toISODate(value)}T${hours}:${minutes}`;
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  label: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  placeholder: { color: '#98a2b3' },
  row: { flexDirection: 'row', gap: 10 },
  shell: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 54,
    paddingHorizontal: 12,
  },
  value: { color: colors.ink, flex: 1, fontSize: 15, paddingVertical: 12 },
});
