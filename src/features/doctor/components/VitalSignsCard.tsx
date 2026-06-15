import { StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';
import type { DoctorVitalSigns } from '@/features/doctor/types/doctorConsultation.types';

const rows: { key: keyof DoctorVitalSigns; label: string; suffix?: string }[] = [
  { key: 'temperature', label: 'Temperatura', suffix: '°C' },
  { key: 'blood_pressure', label: 'Presión arterial' },
  { key: 'heart_rate', label: 'Frecuencia cardíaca', suffix: 'lpm' },
  { key: 'respiratory_rate', label: 'Frecuencia respiratoria', suffix: 'rpm' },
  { key: 'oxygen_saturation', label: 'Oxígeno', suffix: '%' },
  { key: 'weight', label: 'Peso', suffix: 'kg' },
  { key: 'height', label: 'Talla', suffix: 'cm' },
];

export function VitalSignsCard({ vitalSigns }: { vitalSigns?: DoctorVitalSigns | null }) {
  return (
    <AppCard style={styles.card}>
      <Text style={styles.title}>Signos vitales</Text>
      {vitalSigns ? (
        <View style={styles.grid}>
          {rows.map((row) => {
            const value = vitalSigns[row.key];
            return (
              <View key={row.key} style={styles.item}>
                <Text style={styles.label}>{row.label}</Text>
                <Text style={styles.value}>
                  {value ? `${value}${row.suffix ? ` ${row.suffix}` : ''}` : 'No indicado'}
                </Text>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={styles.empty}>No hay signos vitales registrados.</Text>
      )}
      {vitalSigns?.notes ? <Text style={styles.notes}>{vitalSigns.notes}</Text> : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  empty: { color: colors.muted, fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  item: { backgroundColor: colors.surfaceMuted, borderRadius: 14, minWidth: '46%', padding: 12 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  notes: { color: colors.ink, fontSize: 14, lineHeight: 20 },
  title: { color: colors.ink, fontSize: 17, fontWeight: '900' },
  value: { color: colors.ink, fontSize: 15, fontWeight: '900', marginTop: 4 },
});
