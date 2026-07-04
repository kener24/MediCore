import { Pressable, StyleSheet, Text } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { StatusBadge } from '@/components/StatusBadge';
import { colors } from '@/core/theme/colors';
import { formatDate } from '@/core/utils/dateUtils';
import type { PatientPrescription } from '@/features/patient/types/patientPrescriptions.types';

export function PrescriptionCard({
  onPress,
  prescription,
}: {
  onPress?: () => void;
  prescription: PatientPrescription;
}) {
  const itemSummary = prescription.items
    ?.map((item) => item.medication_name || item.name)
    .filter(Boolean)
    .join(', ');
  const medicationSummary = Array.isArray(prescription.medications)
    ? prescription.medications
        .map((item) => (typeof item === 'string' ? item : item.medication_name || item.name))
        .filter(Boolean)
        .join(', ')
    : '';
  const summary = itemSummary || medicationSummary || prescription.summary;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <AppCard>
        <StatusBadge status={prescription.status} />
        <Text style={styles.title}>{prescription.prescription_number || 'Receta médica'}</Text>
        <Text style={styles.meta}>
          {formatDate(prescription.issue_date || prescription.date || prescription.created_at || prescription.creado_en)} ·{' '}
          {prescription.doctor_nombre || prescription.doctor_name || 'Médico'}
        </Text>
        <Text style={styles.text}>
          {summary || prescription.general_instructions || 'Sin medicamentos registrados'}
        </Text>
        <Text style={styles.detailText}>Ver detalle</Text>
      </AppCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  detailText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 12,
  },
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
