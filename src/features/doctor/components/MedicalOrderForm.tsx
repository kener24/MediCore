import { useState } from 'react';
import { Alert, StyleSheet } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { MedicalOrderTypeSelector } from '@/features/doctor/components/MedicalOrderTypeSelector';
import type { CreateMedicalOrderPayload, MedicalOrderPriority, MedicalOrderType } from '@/features/doctor/types/doctorMedicalOrder.types';

const orderTypes: { label: string; value: MedicalOrderType }[] = [
  { label: 'Laboratorio', value: 'laboratorio' },
  { label: 'Imagen', value: 'imagen' },
  { label: 'Procedimiento', value: 'procedimiento' },
  { label: 'Referencia', value: 'referencia' },
  { label: 'Otra', value: 'otra' },
];

const priorities: { label: string; value: MedicalOrderPriority }[] = [
  { label: 'Normal', value: 'normal' },
  { label: 'Prioritaria', value: 'prioritaria' },
  { label: 'Urgente', value: 'urgente' },
];

export function MedicalOrderForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (payload: CreateMedicalOrderPayload) => Promise<void>;
  submitting?: boolean;
}) {
  const [orderType, setOrderType] = useState<MedicalOrderType>('laboratorio');
  const [priority, setPriority] = useState<MedicalOrderPriority>('normal');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [notes, setNotes] = useState('');

  async function submit() {
    if (!orderType) return Alert.alert('Orden médica', 'Selecciona el tipo de orden.');
    if (description.trim().length < 5) return Alert.alert('Orden médica', 'Escribe la descripción de la orden.');
    await onSubmit({
      description: description.trim(),
      instructions: instructions.trim(),
      notes: notes.trim(),
      order_type: orderType,
      priority,
    });
  }

  return (
    <AppCard style={styles.form}>
      <MedicalOrderTypeSelector label="Tipo de orden" onChange={setOrderType} options={orderTypes} value={orderType} />
      <MedicalOrderTypeSelector label="Prioridad" onChange={setPriority} options={priorities} value={priority} />
      <AppInput label="Descripción" multiline onChangeText={setDescription} value={description} />
      <AppInput label="Instrucciones" multiline onChangeText={setInstructions} value={instructions} />
      <AppInput label="Notas" multiline onChangeText={setNotes} value={notes} />
      <AppButton label="Guardar orden médica" loading={submitting} onPress={submit} />
    </AppCard>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14 },
});
