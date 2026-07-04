import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/core/theme/colors';
import type { NormalizedPatientDashboard } from '@/features/patient/types/patientDashboard.types';

type Stats = NormalizedPatientDashboard['stats'];

const items: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  key: keyof Stats;
  label: string;
}[] = [
  { icon: 'calendar-clock', key: 'upcomingAppointments', label: 'Citas próximas' },
  { icon: 'receipt-text-outline', key: 'pendingInvoices', label: 'Facturas' },
  { icon: 'bell-outline', key: 'unreadNotifications', label: 'Notificaciónes' },
  { icon: 'file-document-outline', key: 'recentDocuments', label: 'Documentos' },
];

export function PatientStatsGrid({ stats }: { stats: Stats }) {
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <View key={item.key} style={styles.card}>
          <View style={styles.iconBox}>
            <MaterialCommunityIcons color={colors.primary} name={item.icon} size={21} />
          </View>
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
    flexBasis: '48%',
    flexGrow: 1,
    gap: 7,
    padding: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  iconBox: {
    alignItems: 'center',
    backgroundColor: colors.palePrimary,
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  value: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
  },
});
