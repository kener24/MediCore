import { StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';
import type {
  DoctorPatientMedicalSummary,
  DoctorTriageInfo,
  DoctorVisitDetail,
  DoctorVitalSigns,
} from '@/features/doctor/types/doctorPatient.types';

export function ClinicalSummaryCard({
  medicalSummary,
  triage,
  visit,
  vitalSigns,
}: {
  medicalSummary?: DoctorPatientMedicalSummary | null;
  triage?: DoctorTriageInfo | null;
  visit?: Partial<DoctorVisitDetail> | null;
  vitalSigns?: DoctorVitalSigns | null;
}) {
  const bloodPressure =
    vitalSigns?.blood_pressure ??
    (vitalSigns?.systolic_pressure && vitalSigns?.diastolic_pressure
      ? `${vitalSigns.systolic_pressure}/${vitalSigns.diastolic_pressure}`
      : undefined);

  return (
    <AppCard style={styles.card}>
      <Text style={styles.title}>Resumen clínico rápido</Text>
      <View style={styles.grid}>
        <Info label="Motivo" value={visit?.reason ?? visit?.motivo} />
        <Info label="Prioridad" value={visit?.priority ?? visit?.prioridad} />
        <Info label="Presion arterial" value={bloodPressure} />
        <Info label="Temperatura" value={withSuffix(vitalSigns?.temperature, 'C')} />
        <Info label="Frecuencia cardiaca" value={withSuffix(vitalSigns?.heart_rate, 'lpm')} />
        <Info label="Saturación de oxígeno" value={withSuffix(vitalSigns?.oxygen_saturation, '%')} />
      </View>
      <Info label="Alergias" value={medicalSummary?.allergies ?? medicalSummary?.alergias} />
      <Info
        label="Enfermedades cronicas"
        value={medicalSummary?.chronic_diseases ?? medicalSummary?.enfermedades_cronicas}
      />
      <Info
        label="Triaje"
        value={triage?.initial_assessment ?? triage?.evaluacion_inicial ?? triage?.chief_complaint ?? triage?.motivo_consulta}
      />
    </AppCard>
  );
}

function Info({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View style={styles.info}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || 'No indicado'}</Text>
    </View>
  );
}

function withSuffix(value?: string | number | null, suffix?: string) {
  return value ? `${value} ${suffix}` : undefined;
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  info: { backgroundColor: colors.surfaceMuted, borderRadius: 12, flexGrow: 1, gap: 4, minWidth: '46%', padding: 10 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: colors.ink, fontSize: 17, fontWeight: '900' },
  value: { color: colors.ink, fontSize: 14, fontWeight: '800', lineHeight: 20 },
});
