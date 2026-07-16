import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/core/theme/colors';

export function MedicalOrderTypeSelector<T extends string>({
  disabled,
  label,
  onChange,
  options,
  value,
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: T) => void;
  options: { label: string; value: T }[];
  value: T;
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chips}>
        {options.map((item) => {
          const active = item.value === value;
          return (
            <Pressable disabled={disabled} key={item.value} onPress={() => onChange(item.value)} style={[styles.chip, active && styles.chipActive, disabled && styles.disabled]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  chipTextActive: { color: colors.white },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  disabled: { opacity: 0.55 },
  group: { gap: 8 },
  label: { color: colors.ink, fontSize: 14, fontWeight: '900' },
});
