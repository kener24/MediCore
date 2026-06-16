import type { ComponentProps } from 'react';
import { StyleSheet, Text } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { colors } from '@/core/theme/colors';
import type { ConsultationFormValues } from '@/features/doctor/types/doctorConsultation.types';

type FieldName = keyof ConsultationFormValues;

const fields: {
  icon: ComponentProps<typeof AppInput>['icon'];
  key: FieldName;
  label: string;
  minHeight?: number;
  required?: boolean;
}[] = [
  { icon: 'comment-text-outline', key: 'chief_complaint', label: 'Motivo principal', required: true },
  { icon: 'history', key: 'history_present_illness', label: 'Historia de enfermedad actual', minHeight: 96 },
  { icon: 'stethoscope', key: 'physical_examination', label: 'Examen físico', minHeight: 96 },
  { icon: 'clipboard-pulse-outline', key: 'assessment', label: 'Evaluación clínica', minHeight: 88 },
  { icon: 'clipboard-text-outline', key: 'diagnosis_text', label: 'Diagnóstico', minHeight: 88, required: true },
  { icon: 'clipboard-list-outline', key: 'plan', label: 'Plan de tratamiento', minHeight: 88 },
  { icon: 'hand-heart-outline', key: 'recommendations', label: 'Recomendaciones', minHeight: 88 },
  { icon: 'note-text-outline', key: 'notes', label: 'Notas adicionales', minHeight: 88 },
];

export function ConsultationForm({
  disabled,
  initialValues,
  loading,
  onChange,
  onSaveDraft,
  onSubmit,
}: {
  disabled?: boolean;
  initialValues: ConsultationFormValues;
  loading?: boolean;
  onChange: (field: FieldName, value: string) => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
}) {
  return (
    <AppCard style={styles.form}>
      <Text style={styles.title}>Formulario clínico</Text>
      {fields.map((field) => (
        <AppInput
          editable={!disabled}
          icon={field.icon}
          key={field.key}
          label={`${field.label}${field.required ? ' *' : ''}`}
          multiline
          onChangeText={(value) => onChange(field.key, value)}
          scrollEnabled={false}
          style={[styles.input, field.minHeight ? { minHeight: field.minHeight, textAlignVertical: 'top' } : null]}
          value={initialValues[field.key]}
        />
      ))}
      <AppButton
        disabled={disabled}
        label="Guardar borrador"
        loading={loading}
        onPress={onSaveDraft}
        variant="secondary"
      />
      <AppButton disabled={disabled} label="Guardar cambios" loading={loading} onPress={onSubmit} />
    </AppCard>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14 },
  input: { lineHeight: 22 },
  title: { color: colors.ink, fontSize: 17, fontWeight: '900' },
});
