import { StyleSheet, Text } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';

export function ConsultationActionBar({
  disabled,
  onClinicalConsumption,
  onMedicalOrder,
  onPrescription,
  onSummary,
  readOnly,
}: {
  disabled?: boolean;
  onClinicalConsumption: () => void;
  onMedicalOrder: () => void;
  onPrescription: () => void;
  onSummary: () => void;
  readOnly?: boolean;
}) {
  return (
    <AppCard style={styles.card}>
      <Text style={styles.title}>Acciones clínicas</Text>
      <AppButton disabled={disabled} label="Crear receta" onPress={onPrescription} variant="secondary" />
      <AppButton disabled={disabled} label="Crear orden médica" onPress={onMedicalOrder} variant="secondary" />
      <AppButton disabled={disabled} label="Registrar consumo clínico" onPress={onClinicalConsumption} variant="secondary" />
      <AppButton label={readOnly ? 'Ver resumen' : 'Ver resumen y finalizar'} onPress={onSummary} />
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  title: { color: colors.ink, fontSize: 17, fontWeight: '900' },
});
