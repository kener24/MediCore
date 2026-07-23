import { useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppHeader } from '@/components/AppHeader';
import { AppInput } from '@/components/AppInput';
import { ErrorState } from '@/components/ErrorState';
import { colors } from '@/core/theme/colors';
import { createVitalSigns } from '@/features/nurse/services/nurseApi';
import type { VitalSignsPayload } from '@/features/nurse/types/nurse.types';
import { calculateBmi, getVitalSignAlerts, onlyNumericText, parseOptionalNumber, validateVitalSigns } from '@/features/nurse/utils/nurseValidation';

const initialForm = {
  diastolicPressure: '',
  glucose: '',
  heartRate: '',
  heightCm: '',
  notes: '',
  oxygenSaturation: '',
  painScale: '',
  respiratoryRate: '',
  systolicPressure: '',
  temperature: '',
  weightKg: '',
};

export function NurseVitalSignsFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const visitId = route.params?.visitId;
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const bmi = useMemo(() => calculateBmi(parseOptionalNumber(form.weightKg), parseOptionalNumber(form.heightCm)), [form.heightCm, form.weightKg]);
  const dirty = useMemo(() => Object.values(form).some((value) => value.trim().length > 0), [form]);

  useEffect(() => navigation.addListener('beforeRemove', (event: any) => {
    if (!dirty || saved || saving) return;
    event.preventDefault();
    Alert.alert('Cambios sin guardar', 'Tienes cambios sin guardar. ¿Deseas salir?', [
      { text: 'Continuar editando', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => navigation.dispatch(event.data.action) },
    ]);
  }), [dirty, navigation, saved, saving]);

  function setNumeric(field: keyof typeof initialForm, value: string, decimal = false) {
    setForm((current) => ({ ...current, [field]: onlyNumericText(value, decimal) }));
  }

  async function save() {
    if (saving) return;
    if (!visitId) {
      Alert.alert('Visita no encontrada', 'No se encontró la visita del paciente.');
      return;
    }
    const payload: VitalSignsPayload = {
      bmi,
      diastolic_pressure: parseOptionalNumber(form.diastolicPressure),
      glucose: parseOptionalNumber(form.glucose),
      heart_rate: parseOptionalNumber(form.heartRate),
      height_cm: parseOptionalNumber(form.heightCm),
      notes: form.notes.trim() || undefined,
      oxygen_saturation: parseOptionalNumber(form.oxygenSaturation),
      pain_scale: parseOptionalNumber(form.painScale),
      respiratory_rate: parseOptionalNumber(form.respiratoryRate),
      systolic_pressure: parseOptionalNumber(form.systolicPressure),
      temperature: parseOptionalNumber(form.temperature),
      visit: visitId,
      weight_kg: parseOptionalNumber(form.weightKg),
    };
    const errors = validateVitalSigns(payload);
    if (errors.length) {
      Alert.alert('Revisa los signos vitales', errors.join('\n'));
      return;
    }
    const alerts = getVitalSignAlerts(payload);
    if (alerts.length) {
      Alert.alert('Alertas clínicas', `${alerts.join('\n')}\n\n¿Deseas guardar de todas formas?`, [
        { text: 'Revisar', style: 'cancel' },
        { text: 'Guardar', onPress: () => void submitPayload({ ...payload, confirm_out_of_range: true }) },
      ]);
      return;
    }
    await submitPayload(payload);
  }

  async function submitPayload(payload: VitalSignsPayload) {
    try {
      setSaving(true);
      await createVitalSigns(payload);
      setSaved(true);
      Alert.alert('Listo', 'Signos vitales registrados correctamente.', [{ text: 'Aceptar', onPress: () => navigation.goBack() }]);
    } catch (err) {
      Alert.alert('No se pudo guardar', err instanceof Error ? err.message : 'No se pudieron registrar los signos vitales.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppHeader icon="heart-pulse" subtitle="Captura inicial antes de enviar al médico." title="Signos vitales" />
          {!visitId ? <ErrorState message="No se encontró la visita del paciente." title="Visita no encontrada" /> : null}
          <View style={styles.grid}>
            <AppInput keyboardType="decimal-pad" label="Temperatura °C" onChangeText={(value) => setNumeric('temperature', value, true)} value={form.temperature} />
            <AppInput keyboardType="number-pad" label="Frecuencia cardíaca" onChangeText={(value) => setNumeric('heartRate', value)} value={form.heartRate} />
            <AppInput keyboardType="number-pad" label="Frecuencia respiratoria" onChangeText={(value) => setNumeric('respiratoryRate', value)} value={form.respiratoryRate} />
            <AppInput keyboardType="number-pad" label="Presión sistólica" onChangeText={(value) => setNumeric('systolicPressure', value)} value={form.systolicPressure} />
            <AppInput keyboardType="number-pad" label="Presión diastólica" onChangeText={(value) => setNumeric('diastolicPressure', value)} value={form.diastolicPressure} />
            <AppInput keyboardType="number-pad" label="Saturación de oxígeno" onChangeText={(value) => setNumeric('oxygenSaturation', value)} value={form.oxygenSaturation} />
            <AppInput keyboardType="decimal-pad" label="Peso kg" onChangeText={(value) => setNumeric('weightKg', value, true)} value={form.weightKg} />
            <AppInput keyboardType="decimal-pad" label="Talla cm" onChangeText={(value) => setNumeric('heightCm', value, true)} value={form.heightCm} />
            <AppInput keyboardType="number-pad" label="Dolor 0-10" onChangeText={(value) => setNumeric('painScale', value)} value={form.painScale} />
            <AppInput keyboardType="number-pad" label="Glucosa" onChangeText={(value) => setNumeric('glucose', value)} value={form.glucose} />
          </View>
          <View style={styles.bmiBox}>
            <Text style={styles.bmiLabel}>IMC calculado</Text>
            <Text style={styles.bmiValue}>{bmi ? String(bmi) : 'Pendiente'}</Text>
          </View>
          <TextInput
            multiline
            onChangeText={(notes) => setForm((current) => ({ ...current, notes }))}
            placeholder="Notas de enfermería"
            placeholderTextColor="#98a2b3"
            style={styles.notes}
            value={form.notes}
          />
          <AppButton disabled={!visitId || saving} label="Guardar signos vitales" loading={saving} onPress={save} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bmiBox: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  bmiLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  bmiValue: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
  },
  content: {
    gap: 14,
    padding: 18,
    paddingBottom: 130,
  },
  grid: {
    gap: 12,
  },
  notes: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.ink,
    minHeight: 110,
    padding: 14,
    textAlignVertical: 'top',
  },
  safe: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
