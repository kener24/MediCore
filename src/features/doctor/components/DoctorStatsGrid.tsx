import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/core/theme/colors';
import type { NormalizedDoctorDashboard } from '@/features/doctor/types/doctorDashboard.types';

const items = [
  { icon: 'calendar-today', key: 'todayAppointments', label: 'Citas hoy' },
  { icon: 'account-clock-outline', key: 'waitingPatients', label: 'En sala' },
  { icon: 'check-decagram-outline', key: 'completedConsultations', label: 'Completadas' },
  { icon: 'clipboard-text-clock-outline', key: 'pendingConsultations', label: 'Pendientes' },
] as const;

export function DoctorStatsGrid({ stats }: { stats: NormalizedDoctorDashboard['stats'] }) {
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <View key={item.key} style={styles.card}>
          <MaterialCommunityIcons color={colors.primary} name={item.icon} size={22} />
          <Text style={styles.value}>{stats[item.key]}</Text>
          <Text style={styles.label}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: 5,
    minWidth: '46%',
    padding: 14,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  label: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  value: { color: colors.ink, fontSize: 24, fontWeight: '900' },
});
