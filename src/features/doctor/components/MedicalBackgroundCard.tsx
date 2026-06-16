import { StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';
import type { DoctorPatientMedicalSummary } from '@/features/doctor/types/doctorPatient.types';

export function MedicalBackgroundCard({
  medicalSummary,
}: {
  medicalSummary?: DoctorPatientMedicalSummary | null;
}) {
  const hasData = Boolean(
    medicalSummary?.allergies ||
      medicalSummary?.alergias ||
      medicalSummary?.chronic_diseases ||
      medicalSummary?.enfermedades_cronicas ||
      medicalSummary?.current_medications ||
      medicalSummary?.medicamentos_actuales ||
      medicalSummary?.surgical_history ||
      medicalSummary?.antecedentes_quirurgicos ||
      medicalSummary?.family_history ||
      medicalSummary?.antecedentes_familiares,
  );

  return (
    <AppCard style={styles.card}>
      <Text style={styles.title}>Antecedentes</Text>
      {hasData ? (
        <>
          <Info label="Alergias" value={medicalSummary?.allergies ?? medicalSummary?.alergias} />
          <Info
            label="Enfermedades cronicas"
            value={medicalSummary?.chronic_diseases ?? medicalSummary?.enfermedades_cronicas}
          />
          <Info
            label="Medicamentos actuales"
            value={medicalSummary?.current_medications ?? medicalSummary?.medicamentos_actuales}
          />
          <Info
            label="Antecedentes quirurgicos"
            value={medicalSummary?.surgical_history ?? medicalSummary?.antecedentes_quirurgicos}
          />
          <Info
            label="Antecedentes familiares"
            value={medicalSummary?.family_history ?? medicalSummary?.antecedentes_familiares}
          />
        </>
      ) : (
        <Text style={styles.empty}>No hay antecedentes registrados.</Text>
      )}
    </AppCard>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.info}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || 'No indicado'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  empty: { color: colors.muted, fontSize: 14 },
  info: { gap: 3 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: colors.ink, fontSize: 17, fontWeight: '900' },
  value: { color: colors.ink, fontSize: 14, lineHeight: 20 },
});
