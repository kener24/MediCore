import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/core/theme/colors';
import type { AppointmentModality } from '@/features/patient/types/patientAppointments.types';

const options: {
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: AppointmentModality;
}[] = [
  {
    description: 'Atención en la clínica',
    icon: 'hospital-building',
    label: 'Presencial',
    value: 'presencial',
  },
  {
    description: 'Atención virtual si la clínica lo permite',
    icon: 'video-outline',
    label: 'En línea',
    value: 'online',
  },
];

export function AppointmentModalitySelector({
  onChange,
  value,
}: {
  onChange: (value: AppointmentModality) => void;
  value: AppointmentModality;
}) {
  return (
    <View style={styles.container}>
      {options.map((item) => {
        const selected = item.value === value;
        return (
          <Pressable key={item.value} onPress={() => onChange(item.value)} style={[styles.option, selected && styles.optionSelected]}>
            <MaterialCommunityIcons color={selected ? colors.primary : colors.muted} name={item.icon} size={24} />
            <View style={styles.texts}>
              <Text style={[styles.label, selected && styles.labelSelected]}>{item.label}</Text>
              <Text style={styles.description}>{item.description}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  description: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  label: { color: colors.ink, fontSize: 15, fontWeight: '900' },
  labelSelected: { color: colors.primaryDark },
  option: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  optionSelected: {
    backgroundColor: colors.palePrimary,
    borderColor: colors.primary,
  },
  texts: { flex: 1, gap: 3 },
});
