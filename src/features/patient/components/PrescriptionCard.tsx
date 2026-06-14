import { Pressable, StyleSheet, Text } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';
import { StatusPill } from '@/features/patient/components/StatusPill';
import type { PatientPrescription } from '@/features/patient/types/patientPrescriptions.types';
import { formatDate } from '@/features/patient/utils/formatters';

export function PrescriptionCard({ onPress, prescription }: { onPress?: () => void; prescription: PatientPrescription }) {
  const summary = prescription.items?.map((item) => item.medication_name).filter(Boolean).join(', ');

  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <AppCard>
        <StatusPill label={prescription.status} tone={prescription.status === 'emitida' ? 'success' : 'neutral'} />
        <Text style={styles.title}>{prescription.prescription_number || 'Receta medica'}</Text>
        <Text style={styles.meta}>
          {formatDate(prescription.issue_date || prescription.creado_en)} ·{' '}
          {prescription.doctor_nombre || prescription.doctor_name || 'Medico'}
        </Text>
        <Text style={styles.text}>{summary || prescription.general_instructions || 'Sin medicamentos registrados'}</Text>
      </AppCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  meta: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 5,
  },
  pressed: {
    opacity: 0.85,
  },
  text: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
  title: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 12,
  },
});
