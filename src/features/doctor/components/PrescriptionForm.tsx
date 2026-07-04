import { useState } from 'react';
import { Alert, StyleSheet } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { MedicationFormItem } from '@/features/doctor/components/MedicationFormItem';
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
  quantity: '',
};

export function PrescriptionForm({
  disabled,
  onSubmit,
  submitting,
}: {
  disabled?: boolean;
  onSubmit: (payload: CreatePrescriptionPayload) => Promise<void>;
  submitting?: boolean;
}) {
  const [generalInstructions, setGeneralInstructions] = useState('');
  const [notes, setNotes] = useState('');
  const [medications, setMedications] = useState<PrescriptionMedicationPayload[]>([{ ...emptyMedication }]);

  function updateMedication(index: number, field: keyof PrescriptionMedicationPayload, value: string) {
    setMedications((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    );
  }

  function removeMedication(index: number) {
    setMedications((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function submit() {
    if (disabled) return;
    if (!medications.length) return Alert.alert('Receta medica', 'Agrega al menos un medicamento.');
    for (const item of medications) {
      if (item.medication_name.trim().length < 3) return Alert.alert('Receta medica', 'Escribe el nombre del medicamento.');
      if (item.dosage.trim().length < 2) return Alert.alert('Receta medica', 'Escribe la dosis.');
      if (item.frequency.trim().length < 2) return Alert.alert('Receta medica', 'Escribe la frecuencia.');
      if (item.duration.trim().length < 2) return Alert.alert('Receta medica', 'Escribe la duracion.');
      if (item.quantity && Number.isNaN(Number(item.quantity))) return Alert.alert('Receta medica', 'La cantidad debe ser numerica.');
    }
    await onSubmit({
      general_instructions: generalInstructions.trim(),
      notes: notes.trim(),
      medications: medications.map((item) => ({
        dosage: item.dosage.trim(),
        duration: item.duration.trim(),
        frequency: item.frequency.trim(),
        instructions: item.instructions?.trim(),
        medication_name: item.medication_name.trim(),
        quantity: item.quantity ? String(item.quantity).trim() : undefined,
      })),
    });
  }

  return (
    <AppCard style={styles.form}>
      {medications.map((item, index) => (
        <MedicationFormItem
          disabled={disabled}
          index={index}
          item={item}
          key={index}
          onRemove={() => removeMedication(index)}
          onUpdate={(field, value) => updateMedication(index, field, value)}
          removable={medications.length > 1}
        />
      ))}
      <AppButton disabled={disabled} label="Agregar medicamento" onPress={() => setMedications((current) => [...current, { ...emptyMedication }])} variant="secondary" />
      <AppInput editable={!disabled} label="Instrucciones generales" multiline onChangeText={setGeneralInstructions} value={generalInstructions} />
      <AppInput editable={!disabled} label="Notas" multiline onChangeText={setNotes} value={notes} />
      <AppButton disabled={disabled} label="Guardar receta" loading={submitting} onPress={submit} />
    </AppCard>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14 },
});
