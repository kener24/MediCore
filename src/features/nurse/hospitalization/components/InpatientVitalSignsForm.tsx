import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { colors } from '@/core/theme/colors';
import type { InpatientVitalSignsPayload } from '@/features/nurse/hospitalization/types/nurseHospitalization.types';

type FormState = Record<keyof InpatientVitalSignsPayload, string>;

const initialState: FormState = {
  blood_pressure: '',
  blood_pressure_diastolic: '',
  blood_pressure_systolic: '',
  bmi: '',
  diastolic_pressure: '',
  glucose: '',
  heart_rate: '',
  height: '',
  notes: '',
  oxygen_saturation: '',
  pain_scale: '',
  respiratory_rate: '',
  systolic_pressure: '',
  temperature: '',
  weight: '',
};

function parse(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function validate(state: FormState) {
  const errors: string[] = [];
  const fields = {
    diastolic: parse(state.diastolic_pressure),
    heart: parse(state.heart_rate),
    height: parse(state.height),
    oxygen: parse(state.oxygen_saturation),
    pain: parse(state.pain_scale),
    respiratory: parse(state.respiratory_rate),
    systolic: parse(state.systolic_pressure),
    temperature: parse(state.temperature),
    weight: parse(state.weight),
  };
  if (fields.temperature !== undefined && (Number.isNaN(fields.temperature) || fields.temperature < 30 || fields.temperature > 45)) errors.push('La temperatura debe estar entre 30 y 45 °C.');
  if (fields.systolic !== undefined && (Number.isNaN(fields.systolic) || fields.systolic <= 0)) errors.push('La presión sistólica debe ser mayor que 0.');
  if (fields.diastolic !== undefined && (Number.isNaN(fields.diastolic) || fields.diastolic <= 0)) errors.push('La presión diastólica debe ser mayor que 0.');
  if (fields.systolic && fields.diastolic && fields.systolic <= fields.diastolic) errors.push('La presión sistólica debe ser mayor que la diastólica.');
  if (fields.heart !== undefined && (Number.isNaN(fields.heart) || fields.heart <= 0)) errors.push('La frecuencia cardíaca debe ser mayor que 0.');
  if (fields.respiratory !== undefined && (Number.isNaN(fields.respiratory) || fields.respiratory <= 0)) errors.push('La frecuencia respiratoria debe ser mayor que 0.');
  if (fields.oxygen !== undefined && (Number.isNaN(fields.oxygen) || fields.oxygen < 0 || fields.oxygen > 100)) errors.push('La saturación de oxígeno debe estar entre 0 y 100.');
  if (fields.weight !== undefined && (Number.isNaN(fields.weight) || fields.weight <= 0)) errors.push('El peso debe ser mayor que 0.');
  if (fields.height !== undefined && (Number.isNaN(fields.height) || fields.height <= 0)) errors.push('La talla debe ser mayor que 0.');
  if (fields.pain !== undefined && (Number.isNaN(fields.pain) || fields.pain < 0 || fields.pain > 10)) errors.push('La escala de dolor debe estar entre 0 y 10.');
  return errors;
}

function calculateBmi(weightValue: string, heightValue: string) {
  const weight = parse(weightValue);
  const heightInput = parse(heightValue);
  if (!weight || !heightInput || Number.isNaN(weight) || Number.isNaN(heightInput)) return '';
  const meters = heightInput > 3 ? heightInput / 100 : heightInput;
  return (weight / (meters * meters)).toFixed(1);
}

export function InpatientVitalSignsForm({
  loading,
  onSubmit,
}: {
  loading?: boolean;
  onSubmit: (payload: InpatientVitalSignsPayload) => void;
}) {
  const [state, setState] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<string[]>([]);
  const bmi = useMemo(() => calculateBmi(state.weight, state.height), [state.weight, state.height]);

  function setField(field: keyof FormState, value: string) {
    const sanitized = field === 'notes' ? value : value.replace(/[^0-9.,]/g, '');
    setState((current) => ({ ...current, [field]: sanitized }));
  }

  function submit() {
    if (loading) return;
    const validation = validate(state);
    setErrors(validation);
    if (validation.length) return;
    onSubmit({
      diastolic_pressure: state.diastolic_pressure,
      heart_rate: state.heart_rate,
      height: state.height,
      notes: state.notes,
      oxygen_saturation: state.oxygen_saturation,
      pain_scale: state.pain_scale,
      respiratory_rate: state.respiratory_rate,
      systolic_pressure: state.systolic_pressure,
      temperature: state.temperature,
      weight: state.weight,
    });
  }

  return (
    <View style={styles.form}>
      <View style={styles.row}>
        <AppInput icon="thermometer" keyboardType="decimal-pad" label="Temperatura" onChangeText={(value) => setField('temperature', value)} value={state.temperature} />
        <AppInput icon="heart-pulse" keyboardType="number-pad" label="Frecuencia cardíaca" onChangeText={(value) => setField('heart_rate', value)} value={state.heart_rate} />
      </View>
      <View style={styles.row}>
        <AppInput icon="arrow-up-bold" keyboardType="number-pad" label="Presión sistólica" onChangeText={(value) => setField('systolic_pressure', value)} value={state.systolic_pressure} />
        <AppInput icon="arrow-down-bold" keyboardType="number-pad" label="Presión diastólica" onChangeText={(value) => setField('diastolic_pressure', value)} value={state.diastolic_pressure} />
      </View>
      <View style={styles.row}>
        <AppInput icon="lungs" keyboardType="number-pad" label="Frecuencia respiratoria" onChangeText={(value) => setField('respiratory_rate', value)} value={state.respiratory_rate} />
        <AppInput icon="percent-outline" keyboardType="number-pad" label="Saturación de oxígeno" onChangeText={(value) => setField('oxygen_saturation', value)} value={state.oxygen_saturation} />
      </View>
      <View style={styles.row}>
        <AppInput icon="scale-bathroom" keyboardType="decimal-pad" label="Peso" onChangeText={(value) => setField('weight', value)} value={state.weight} />
        <AppInput icon="human-male-height" keyboardType="decimal-pad" label="Talla" onChangeText={(value) => setField('height', value)} value={state.height} />
      </View>
      <View style={styles.row}>
        <View style={styles.bmiBox}>
          <Text style={styles.bmiLabel}>IMC calculado</Text>
          <Text style={styles.bmiValue}>{bmi || 'Pendiente'}</Text>
        </View>
        <AppInput icon="emoticon-sad-outline" keyboardType="number-pad" label="Dolor 0-10" onChangeText={(value) => setField('pain_scale', value)} value={state.pain_scale} />
      </View>
      <AppInput icon="note-text-outline" label="Notas" multiline onChangeText={(value) => setField('notes', value)} style={styles.notesInput} value={state.notes} />
      {errors.map((error) => (
        <Text key={error} style={styles.error}>{error}</Text>
      ))}
      <AppButton disabled={loading} label="Guardar signos hospitalarios" loading={loading} onPress={submit} />
    </View>
  );
}

const styles = StyleSheet.create({
  bmiBox: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    minHeight: 74,
    padding: 14,
  },
  bmiLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  bmiValue: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  form: {
    gap: 14,
  },
  notesInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
});
