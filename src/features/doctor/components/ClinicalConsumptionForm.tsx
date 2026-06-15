import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { colors } from '@/core/theme/colors';
import type { ClinicalConsumptionPayload } from '@/features/doctor/types/doctorClinicalConsumption.types';

export function ClinicalConsumptionForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (payload: ClinicalConsumptionPayload) => Promise<void>;
  submitting?: boolean;
}) {
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [billable, setBillable] = useState(true);

  async function submit() {
    const numericQuantity = Number(quantity);
    if (!itemName.trim() || !Number.isFinite(numericQuantity) || numericQuantity <= 0) {
      Alert.alert('Consumo clínico', 'Insumo y cantidad válida son requeridos.');
      return;
    }
    await onSubmit({
      billable,
      item_name: itemName.trim(),
      notes: notes.trim(),
      quantity: numericQuantity,
    });
  }

  return (
    <AppCard style={styles.form}>
      <AppInput label="Insumo o producto" onChangeText={setItemName} value={itemName} />
      <AppInput keyboardType="numeric" label="Cantidad" onChangeText={setQuantity} value={quantity} />
      <AppInput label="Notas" multiline onChangeText={setNotes} value={notes} />
      <View style={styles.row}>
        <Text style={styles.label}>Facturable</Text>
        <Pressable onPress={() => setBillable((value) => !value)} style={[styles.toggle, billable && styles.toggleActive]}>
          <Text style={[styles.toggleText, billable && styles.toggleTextActive]}>{billable ? 'Sí' : 'No'}</Text>
        </Pressable>
      </View>
      <AppButton label="Registrar consumo" loading={submitting} onPress={submit} />
    </AppCard>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14 },
  label: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  toggle: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  toggleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleText: { color: colors.muted, fontWeight: '900' },
  toggleTextActive: { color: colors.white },
});
