import { StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';
import type { ReceptionStats } from '@/features/reception/types/receptionAdmission.types';

export function ReceptionStatsGrid({ stats }: { stats: ReceptionStats }) {
  const rows = [
    ['Citas hoy', stats.today_appointments ?? 0],
    ['Admisiones', stats.registered_today ?? stats.today_admissions ?? 0],
    ['Esperando triaje', stats.waiting_triage ?? 0],
    ['Esperando medico', stats.waiting_doctor ?? 0],
    ['Pendiente cobro', stats.waiting_billing ?? 0],
    ['Canceladas', stats.cancelled ?? 0],
  ];

  return (
    <View style={styles.grid}>
      {rows.map(([label, value]) => (
        <AppCard key={label} style={styles.stat}>
          <Text style={styles.value}>{value}</Text>
          <Text style={styles.label}>{label}</Text>
        </AppCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  label: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  stat: { flexBasis: '47%', flexGrow: 1, gap: 4 },
  value: { color: colors.ink, fontSize: 24, fontWeight: '900' },
});
