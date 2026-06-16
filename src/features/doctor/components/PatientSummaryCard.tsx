import { StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';
import type { DoctorPatientBasicInfo } from '@/features/doctor/types/doctorPatient.types';

function valueOf(value?: string | number | null) {
  return value || 'No indicado';
}

export function PatientSummaryCard({ patient }: { patient?: DoctorPatientBasicInfo | null }) {
  const name = patient?.full_name ?? patient?.nombre_completo ?? 'Paciente no indicado';
  return (
    <AppCard style={styles.card}>
      <Text style={styles.title}>{name}</Text>
      <View style={styles.row}>
        <Info label="Edad" value={patient?.age ?? patient?.edad} />
        <Info label="Género" value={patient?.gender ?? patient?.genero} />
      </View>
      <Info label="Teléfono" value={patient?.phone ?? patient?.telefono} />
      <Info label="Expediente" value={patient?.medical_record_number ?? patient?.expediente} />
      <Info label="Código paciente" value={patient?.patient_code ?? patient?.codigo_paciente} />
      <Info label="Identidad" value={patient?.identity_number ?? patient?.identidad} />
      <Info label="Tipo de sangre" value={patient?.blood_type} />
    </AppCard>
  );
}

function Info({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View style={styles.info}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{valueOf(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  info: { flex: 1, gap: 3 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  row: { flexDirection: 'row', gap: 10 },
  title: { color: colors.ink, fontSize: 20, fontWeight: '900' },
  value: { color: colors.ink, fontSize: 14, lineHeight: 20 },
});
