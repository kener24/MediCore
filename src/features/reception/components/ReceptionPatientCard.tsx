import { Pressable, StyleSheet, Text } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';
import { patientIdentity, patientName, patientPhone } from '@/features/reception/services/receptionMappers';
import type { ReceptionPatient } from '@/features/reception/types/receptionPatient.types';

export function ReceptionPatientCard({
  onCreateAdmission,
  onPress,
  patient,
}: {
  onCreateAdmission?: () => void;
  onPress?: () => void;
  patient: ReceptionPatient;
}) {
  return (
    <AppCard style={styles.card}>
      <Pressable onPress={onPress} style={styles.body}>
        <Text style={styles.title}>{patientName(patient)}</Text>
        <Text style={styles.meta}>Identidad: {patientIdentity(patient)}</Text>
        <Text style={styles.meta}>Teléfono: {patientPhone(patient)}</Text>
        <Text style={styles.meta}>Código: {patient.patient_code ?? patient.codigo_paciente ?? 'Sin código'}</Text>
      </Pressable>
      {onCreateAdmission ? (
        <Pressable onPress={onCreateAdmission} style={styles.action}>
          <Text style={styles.actionText}>Crear admisión</Text>
        </Pressable>
      ) : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  action: { backgroundColor: colors.primary, borderRadius: 12, marginTop: 12, padding: 12 },
  actionText: { color: colors.white, fontSize: 13, fontWeight: '900', textAlign: 'center' },
  body: { gap: 4 },
  card: { gap: 2 },
  meta: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  title: { color: colors.ink, fontSize: 17, fontWeight: '900' },
});
