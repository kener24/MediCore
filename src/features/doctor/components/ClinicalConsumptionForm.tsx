import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { colors } from '@/core/theme/colors';
import { InventoryItemSelector } from '@/features/doctor/components/InventoryItemSelector';
import type { ClinicalConsumptionPayload, InventoryItem } from '@/features/doctor/types/doctorClinicalConsumption.types';

export function ClinicalConsumptionForm({
  disabled,
  inventoryItems = [],
  onChangeSearch,
  onSubmit,
  search = '',
  submitting,
}: {
  disabled?: boolean;
  inventoryItems?: InventoryItem[];
  onChangeSearch?: (value: string) => void;
  onSubmit: (payload: ClinicalConsumptionPayload) => Promise<void>;
  search?: string;
  submitting?: boolean;
}) {
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [billable, setBillable] = useState(true);

  async function submit() {
    if (disabled) return;
    const numericQuantity = Number(quantity);
    const stock = selectedItem?.stock === undefined ? undefined : Number(selectedItem.stock);
    if (!selectedItem && !itemName.trim()) return Alert.alert('Consumo clínico', 'Selecciona un insumo.');
    if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) return Alert.alert('Consumo clínico', 'La cantidad debe ser mayor que cero.');
    if (stock !== undefined && Number.isFinite(stock) && numericQuantity > stock) return Alert.alert('Consumo clínico', 'No hay stock suficiente.');
    await onSubmit({
      billable,
      item_id: selectedItem?.id,
      item_name: selectedItem ? selectedItem.name ?? selectedItem.nombre : itemName.trim(),
      notes: notes.trim(),
      quantity: numericQuantity,
    });
  }

  return (
    <AppCard style={styles.form}>
      {onChangeSearch ? (
        <InventoryItemSelector items={inventoryItems} onChangeSearch={onChangeSearch} onSelect={setSelectedItem} search={search} selected={selectedItem} />
      ) : null}
      {!selectedItem ? <AppInput editable={!disabled} label="Insumo o producto" onChangeText={setItemName} value={itemName} /> : null}
      <AppInput editable={!disabled} keyboardType="numeric" label="Cantidad" onChangeText={(value) => setQuantity(value.replace(/[^0-9.]/g, ''))} value={quantity} />
      <AppInput editable={!disabled} label="Notas" multiline onChangeText={setNotes} value={notes} />
      <View style={styles.row}>
        <Text style={styles.label}>Facturable</Text>
        <Pressable disabled={disabled} onPress={() => setBillable((value) => !value)} style={[styles.toggle, billable && styles.toggleActive, disabled && styles.disabled]}>
          <Text style={[styles.toggleText, billable && styles.toggleTextActive]}>{billable ? 'Sí' : 'No'}</Text>
        </Pressable>
      </View>
      <AppButton disabled={disabled} label="Registrar consumo clínico" loading={submitting} onPress={submit} />
    </AppCard>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.55 },
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
