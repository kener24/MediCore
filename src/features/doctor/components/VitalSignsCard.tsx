import { StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';
import type { DoctorVitalSigns } from '@/features/doctor/types/doctorPatient.types';

const rows: { key: keyof DoctorVitalSigns; label: string; suffix?: string }[] = [
  { key: 'temperature', label: 'Temperatura', suffix: '°C' },
  { key: 'heart_rate', label: 'Frecuencia cardíaca', suffix: 'lpm' },
  { key: 'respiratory_rate', label: 'Frecuencia respiratoria', suffix: 'rpm' },
  { key: 'oxygen_saturation', label: 'Saturación de oxígeno', suffix: '%' },
  { key: 'weight', label: 'Peso', suffix: 'kg' },
  { key: 'height', label: 'Talla', suffix: 'cm' },
  { key: 'bmi', label: 'IMC' },
  { key: 'pain_scale', label: 'Escala de dolor' },
];

export function VitalSignsCard({ vitalSigns }: { vitalSigns?: DoctorVitalSigns | null }) {
  const bloodPressure =
    vitalSigns?.blood_pressure ??
    (vitalSigns?.systolic_pressure && vitalSigns?.diastolic_pressure
      ? `${vitalSigns.systolic_pressure}/${vitalSigns.diastolic_pressure}`
      : null);

  return (
    <AppCard style={styles.card}>
      <Text style={styles.title}>Signos vitales</Text>
      {vitalSigns ? (
        <View style={styles.grid}>
          <VitalItem label="Presión arterial" value={bloodPressure} />
          {rows.map((row) => (
            <VitalItem
              key={row.key}
              label={row.label}
              suffix={row.suffix}
              value={vitalSigns[row.key] as string | number | null | undefined}
            />
          ))}
        </View>
      ) : (
        <Text style={styles.empty}>No hay signos vitales registrados.</Text>
      )}
      {vitalSigns?.notes ? <Text style={styles.notes}>{vitalSigns.notes}</Text> : null}
      {vitalSigns?.recorded_by_name ? (
        <Text style={styles.meta}>Registrado por {vitalSigns.recorded_by_name}</Text>
      ) : null}
    </AppCard>
  );
}

function VitalItem({
  label,
  suffix,
  value,
}: {
  label: string;
  suffix?: string;
  value?: string | number | null;
}) {
  return (
    <View style={styles.item}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value ? `${value}${suffix ? ` ${suffix}` : ''}` : 'No indicado'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  empty: { color: colors.muted, fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  item: { backgroundColor: colors.surfaceMuted, borderRadius: 14, minWidth: '46%', padding: 12 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  meta: { color: colors.muted, fontSize: 12 },
  notes: { color: colors.ink, fontSize: 14, lineHeight: 20 },
  title: { color: colors.ink, fontSize: 17, fontWeight: '900' },
  value: { color: colors.ink, fontSize: 15, fontWeight: '900', marginTop: 4 },
});
