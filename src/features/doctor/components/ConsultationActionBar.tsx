import { StyleSheet, Text } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';

export function ConsultationActionBar({
  disabled,
  onAttachments,
  onClinicalConsumption,
  onMedicalOrder,
  onPrescription,
  onSummary,
  readOnly,
}: {
  disabled?: boolean;
  onAttachments: () => void;
  onClinicalConsumption: () => void;
  onMedicalOrder: () => void;
  onPrescription: () => void;
  onSummary: () => void;
  readOnly?: boolean;
}) {
  return (
    <AppCard style={styles.card}>
      <Text style={styles.title}>Acciones clínicas</Text>
      <Text style={styles.subtitle}>
        {readOnly ? 'Consulta finalizada: las acciones quedan en modo lectura.' : 'Guarda la consulta antes de agregar indicaciones clínicas.'}
      </Text>
      <AppButton disabled={disabled || readOnly} label="Crear receta" onPress={onPrescription} variant="secondary" />
      <AppButton disabled={disabled || readOnly} label="Crear orden médica" onPress={onMedicalOrder} variant="secondary" />
      <AppButton disabled={disabled || readOnly} label="Registrar consumo clínico" onPress={onClinicalConsumption} variant="secondary" />
      <AppButton disabled={disabled || readOnly} label="Adjuntar documento" onPress={onAttachments} variant="secondary" />
      <AppButton disabled={disabled} label={readOnly ? 'Ver resumen' : 'Ver resumen y finalizar'} onPress={onSummary} />
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  subtitle: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  title: { color: colors.ink, fontSize: 17, fontWeight: '900' },
});
