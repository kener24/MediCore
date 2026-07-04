import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';
import type { DoctorPatientMedicalSummary } from '@/features/doctor/types/doctorPatient.types';

export function ClinicalRiskBanner({
  medicalSummary,
}: {
  medicalSummary?: DoctorPatientMedicalSummary | null;
}) {
  const allergies = medicalSummary?.allergies ?? medicalSummary?.alergias;
  const chronic = medicalSummary?.chronic_diseases ?? medicalSummary?.enfermedades_cronicas;
  const medications = medicalSummary?.current_medications ?? medicalSummary?.medicamentos_actuales;

  if (!allergies && !chronic && !medications) return null;

  return (
    <AppCard style={styles.card}>
      <View style={styles.header}>
        <MaterialCommunityIcons color={colors.danger} name="alert-octagon-outline" size={22} />
        <Text style={styles.title}>Alertas clinicas</Text>
      </View>
      {allergies ? <Risk label="Alergias" value={allergies} danger /> : null}
      {chronic ? <Risk label="Cronicos" value={chronic} /> : null}
      {medications ? <Risk label="Medicamentos actuales" value={medications} /> : null}
    </AppCard>
  );
}

function Risk({ danger, label, value }: { danger?: boolean; label: string; value: string }) {
  return (
    <View style={[styles.risk, danger && styles.riskDanger]}>
      <Text style={[styles.riskLabel, danger && styles.riskLabelDanger]}>{label}</Text>
      <Text style={styles.riskValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderColor: '#fecaca', gap: 10 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  risk: { backgroundColor: colors.surfaceMuted, borderRadius: 12, gap: 4, padding: 10 },
  riskDanger: { backgroundColor: '#fff1f2' },
  riskLabel: { color: colors.muted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  riskLabelDanger: { color: colors.danger },
  riskValue: { color: colors.ink, fontSize: 14, fontWeight: '800', lineHeight: 20 },
  title: { color: colors.danger, fontSize: 16, fontWeight: '900' },
});
