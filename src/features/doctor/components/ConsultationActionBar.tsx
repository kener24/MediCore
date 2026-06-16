import { Alert, StyleSheet, Text } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';

export function ConsultationActionBar({
  disabled,
  onClinicalConsumption,
  onMedicalOrder,
  onPrescription,
}: {
  disabled?: boolean;
  onClinicalConsumption: () => void;
  onMedicalOrder: () => void;
  onPrescription: () => void;
}) {
  return (
    <AppCard style={styles.card}>
      <Text style={styles.title}>Acciones clínicas</Text>
      <AppButton disabled={disabled} label="Crear receta" onPress={onPrescription} variant="secondary" />
      <AppButton disabled={disabled} label="Crear orden médica" onPress={onMedicalOrder} variant="secondary" />
      <AppButton disabled={disabled} label="Registrar consumo clínico" onPress={onClinicalConsumption} variant="secondary" />
      <AppButton
        disabled
        label="Finalizar atención"
        onPress={() => Alert.alert('Consulta médica', 'La finalización se completará en el siguiente sprint.')}
      />
      <Text style={styles.note}>La finalización se completará en el siguiente sprint.</Text>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  note: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  title: { color: colors.ink, fontSize: 17, fontWeight: '900' },
});
