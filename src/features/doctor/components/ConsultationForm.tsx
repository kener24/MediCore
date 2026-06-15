import { StyleSheet } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import type { ConsultationPayload } from '@/features/doctor/types/doctorConsultation.types';

export function ConsultationForm({
  form,
  onChange,
  onSave,
  saving,
}: {
  form: ConsultationPayload;
  onChange: (field: keyof ConsultationPayload, value: string) => void;
  onSave: () => void;
  saving?: boolean;
}) {
  return (
    <AppCard style={styles.form}>
      <AppInput
        icon="comment-text-outline"
        label="Motivo principal"
        onChangeText={(value) => onChange('chief_complaint', value)}
        value={form.chief_complaint ?? ''}
      />
      <AppInput
        icon="history"
        label="Historia de enfermedad actual"
        multiline
        onChangeText={(value) => onChange('history_present_illness', value)}
        value={form.history_present_illness ?? ''}
      />
      <AppInput
        icon="stethoscope"
        label="Examen físico"
        multiline
        onChangeText={(value) => onChange('physical_examination', value)}
        value={form.physical_examination ?? ''}
      />
      <AppInput
        icon="clipboard-pulse-outline"
        label="Diagnóstico / evaluación"
        multiline
        onChangeText={(value) => onChange('diagnosis_text', value)}
        value={form.diagnosis_text ?? ''}
      />
      <AppInput
        icon="clipboard-list-outline"
        label="Plan"
        multiline
        onChangeText={(value) => onChange('plan', value)}
        value={form.plan ?? ''}
      />
      <AppInput
        icon="hand-heart-outline"
        label="Recomendaciones"
        multiline
        onChangeText={(value) => onChange('recommendations', value)}
        value={form.recommendations ?? ''}
      />
      <AppButton label="Guardar borrador" loading={saving} onPress={onSave} />
    </AppCard>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14 },
});
