import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { colors } from '@/core/theme/colors';
import type { ConsultationFormValues } from '@/features/doctor/types/doctorConsultation.types';
import { consultationProgress } from '@/features/doctor/utils/clinicalValidation';

type FieldName = keyof ConsultationFormValues;

const fields: {
  icon: ComponentProps<typeof AppInput>['icon'];
  key: FieldName;
  label: string;
  minHeight?: number;
  required?: boolean;
}[] = [
  { icon: 'comment-text-outline', key: 'chief_complaint', label: 'Motivo principal', required: true },
  { icon: 'history', key: 'history_present_illness', label: 'Historia de enfermedad actual', minHeight: 96, required: true },
  { icon: 'stethoscope', key: 'physical_examination', label: 'Examen físico', minHeight: 96, required: true },
  { icon: 'clipboard-pulse-outline', key: 'assessment', label: 'Evaluación clínica', minHeight: 88 },
  { icon: 'clipboard-text-outline', key: 'diagnosis_text', label: 'Diagnóstico', minHeight: 88, required: true },
  { icon: 'clipboard-list-outline', key: 'plan', label: 'Plan de tratamiento', minHeight: 88, required: true },
  { icon: 'hand-heart-outline', key: 'recommendations', label: 'Recomendaciones', minHeight: 88, required: true },
  { icon: 'note-text-outline', key: 'notes', label: 'Notas adicionales', minHeight: 88 },
];

export function ConsultationForm({
  disabled,
  initialValues,
  loading,
  onChange,
  onFinish,
  onSaveDraft,
  onSubmit,
}: {
  disabled?: boolean;
  initialValues: ConsultationFormValues;
  loading?: boolean;
  onChange: (field: FieldName, value: string) => void;
  onFinish?: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
}) {
  const progress = consultationProgress(initialValues);

  return (
    <AppCard style={styles.form}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Formulario clínico</Text>
          <Text style={styles.subtitle}>
            {progress.completed}/{progress.required} campos criticos completos
          </Text>
        </View>
        <Text style={styles.percent}>{progress.percent}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress.percent}%` }]} />
      </View>
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
      <AppButton disabled={disabled} label="Guardar borrador" loading={loading} onPress={onSaveDraft} variant="secondary" />
      <AppButton disabled={disabled} label="Guardar consulta" loading={loading} onPress={onSubmit} />
      {onFinish ? <AppButton disabled={disabled} label="Finalizar consulta" loading={loading} onPress={onFinish} /> : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  input: { lineHeight: 22 },
  percent: { color: colors.primary, fontSize: 18, fontWeight: '900' },
  progressFill: { backgroundColor: colors.primary, borderRadius: 999, height: 8 },
  progressTrack: { backgroundColor: colors.surfaceMuted, borderRadius: 999, height: 8, overflow: 'hidden' },
  subtitle: { color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 3 },
  title: { color: colors.ink, fontSize: 17, fontWeight: '900' },
});
