import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { colors } from '@/core/theme/colors';
import type { CreateMedicalOrderPayload } from '@/features/doctor/types/doctorMedicalOrder.types';

const orderTypes = ['laboratorio', 'imagen', 'procedimiento', 'referencia', 'otra'];
const priorities = ['normal', 'alta', 'urgente'];

export function MedicalOrderForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (payload: CreateMedicalOrderPayload) => Promise<void>;
  submitting?: boolean;
}) {
  const [orderType, setOrderType] = useState(orderTypes[0]);
  const [priority, setPriority] = useState(priorities[0]);
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');

  async function submit() {
    if (!orderType || !description.trim()) {
      Alert.alert('Orden médica', 'Tipo de orden y descripción son requeridos.');
      return;
    }
    await onSubmit({
      description: description.trim(),
      instructions: instructions.trim(),
      order_type: orderType,
      priority,
    });
  }

  return (
    <AppCard style={styles.form}>
      <Text style={styles.label}>Tipo de orden</Text>
      <View style={styles.chips}>
        {orderTypes.map((item) => (
          <Chip active={item === orderType} key={item} label={item} onPress={() => setOrderType(item)} />
        ))}
      </View>
      <Text style={styles.label}>Prioridad</Text>
      <View style={styles.chips}>
        {priorities.map((item) => (
          <Chip active={item === priority} key={item} label={item} onPress={() => setPriority(item)} />
        ))}
      </View>
      <AppInput label="Descripción" multiline onChangeText={setDescription} value={description} />
      <AppInput label="Instrucciones" multiline onChangeText={setInstructions} value={instructions} />
      <AppButton label="Guardar orden" loading={submitting} onPress={submit} />
    </AppCard>
  );
}

function Chip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.muted, fontSize: 12, fontWeight: '900', textTransform: 'capitalize' },
  chipTextActive: { color: colors.white },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  form: { gap: 14 },
  label: { color: colors.ink, fontSize: 14, fontWeight: '900' },
});
