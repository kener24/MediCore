import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/core/theme/colors';
import { formatTime } from '@/core/utils/dateUtils';
import type { AppointmentAvailabilitySlot } from '@/features/patient/types/patientAppointments.types';

export function AvailabilitySlotSelector({
  onSelectSlot,
  selectedSlot,
  slots,
}: {
  onSelectSlot: (slot: AppointmentAvailabilitySlot) => void;
  selectedSlot: AppointmentAvailabilitySlot | null;
  slots: AppointmentAvailabilitySlot[];
}) {
  return (
    <View style={styles.grid}>
      {slots.map((slot) => {
        const disabled = slot.available === false;
        const selected = selectedSlot?.start_time === slot.start_time;
        return (
          <Pressable
            disabled={disabled}
            key={`${slot.start_time}-${slot.end_time}`}
            onPress={() => onSelectSlot(slot)}
            style={[styles.slot, selected && styles.selected, disabled && styles.disabled]}>
            <Text style={[styles.label, selected && styles.selectedLabel, disabled && styles.disabledLabel]}>
              {formatTime(slot.start_time)}
              {slot.end_time ? ` - ${formatTime(slot.end_time)}` : ''}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  disabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  disabledLabel: {
    color: '#94A3B8',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  label: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  selected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  selectedLabel: {
    color: colors.white,
  },
  slot: {
    backgroundColor: colors.white,
    borderColor: '#BFDBFE',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
