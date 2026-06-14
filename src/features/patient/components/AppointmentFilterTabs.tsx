import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/core/theme/colors';
import type { PatientAppointmentFilter } from '@/features/patient/types/patientAppointments.types';

const options: { label: string; value: PatientAppointmentFilter }[] = [
  { label: 'Proximas', value: 'upcoming' },
  { label: 'Historial', value: 'history' },
  { label: 'Todas', value: 'all' },
];

export function AppointmentFilterTabs({
  onChangeFilter,
  selectedFilter,
}: {
  onChangeFilter: (filter: PatientAppointmentFilter) => void;
  selectedFilter: PatientAppointmentFilter;
}) {
  return (
    <View style={styles.container}>
      {options.map((item) => {
        const active = item.value === selectedFilter;
        return (
          <Pressable
            key={item.value}
            onPress={() => onChangeFilter(item.value)}
            style={[styles.tab, active && styles.activeTab]}>
            <Text style={[styles.label, active && styles.activeLabel]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  activeLabel: {
    color: colors.white,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  container: {
    backgroundColor: '#E2E8F0',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 4,
    padding: 4,
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  tab: {
    borderRadius: 12,
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 11,
  },
});
