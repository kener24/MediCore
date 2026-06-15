import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { colors } from '@/core/theme/colors';
import type {
  CreatePrescriptionPayload,
  PrescriptionMedicationPayload,
} from '@/features/doctor/types/doctorPrescription.types';

const emptyMedication: PrescriptionMedicationPayload = {
  dosage: '',
  duration: '',
  frequency: '',
  instructions: '',
  medication_name: '',
};

export function PrescriptionForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (payload: CreatePrescriptionPayload) => Promise<void>;
  submitting?: boolean;
}) {
  const [generalInstructions, setGeneralInstructions] = useState('');
  const [medications, setMedications] = useState<PrescriptionMedicationPayload[]>([{ ...emptyMedication }]);

  function updateMedication(index: number, field: keyof PrescriptionMedicationPayload, value: string) {
    setMedications((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    );
  }

  async function submit() {
    const invalid = medications.some(
      (item) => !item.medication_name.trim() || !item.dosage.trim() || !item.frequency.trim() || !item.duration.trim(),
    );
    if (invalid) {
      Alert.alert('Receta médica', 'Medicamento, dosis, frecuencia y duración son requeridos.');
      return;
    }
    await onSubmit({
      general_instructions: generalInstructions.trim(),
      medications: medications.map((item) => ({
        dosage: item.dosage.trim(),
        duration: item.duration.trim(),
        frequency: item.frequency.trim(),
        instructions: item.instructions?.trim(),
        medication_name: item.medication_name.trim(),
      })),
    });
  }

  return (
    <AppCard style={styles.form}>
      {medications.map((item, index) => (
        <View key={index} style={styles.medication}>
          <Text style={styles.subtitle}>Medicamento {index + 1}</Text>
          <AppInput label="Medicamento" onChangeText={(value) => updateMedication(index, 'medication_name', value)} value={item.medication_name} />
          <AppInput label="Dosis" onChangeText={(value) => updateMedication(index, 'dosage', value)} value={item.dosage} />
          <AppInput label="Frecuencia" onChangeText={(value) => updateMedication(index, 'frequency', value)} value={item.frequency} />
          <AppInput label="Duración" onChangeText={(value) => updateMedication(index, 'duration', value)} value={item.duration} />
          <AppInput label="Indicaciones" multiline onChangeText={(value) => updateMedication(index, 'instructions', value)} value={item.instructions ?? ''} />
        </View>
      ))}
      <AppButton
        label="Agregar medicamento"
        onPress={() => setMedications((current) => [...current, { ...emptyMedication }])}
        variant="secondary"
      />
      <AppInput label="Instrucciones generales" multiline onChangeText={setGeneralInstructions} value={generalInstructions} />
      <AppButton label="Guardar receta" loading={submitting} onPress={submit} />
    </AppCard>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14 },
  medication: { borderBottomColor: colors.border, borderBottomWidth: 1, gap: 10, paddingBottom: 14 },
  subtitle: { color: colors.ink, fontSize: 15, fontWeight: '900' },
});
