import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { colors } from '@/core/theme/colors';
import { MedicalOrderTypeSelector } from '@/features/doctor/components/MedicalOrderTypeSelector';
import type { InventoryItem } from '@/features/doctor/types/doctorClinicalConsumption.types';
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
  disabled,
  favoriteOrders,
  orderCatalog,
  onSearchOrder,
  onSubmit,
  submitting,
}: {
  disabled?: boolean;
  favoriteOrders?: CreateMedicalOrderPayload[];
  orderCatalog?: InventoryItem[];
  onSearchOrder?: (value: string, type: MedicalOrderType) => void;
  onSubmit: (payload: CreateMedicalOrderPayload) => Promise<void>;
  submitting?: boolean;
}) {
  const [orderType, setOrderType] = useState<MedicalOrderType>('laboratorio');
  const [priority, setPriority] = useState<MedicalOrderPriority>('normal');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [notes, setNotes] = useState('');

  function applyOrder(values: Partial<CreateMedicalOrderPayload>) {
    if (values.order_type) setOrderType(values.order_type);
    if (values.priority) setPriority(values.priority);
    if (values.description !== undefined) setDescription(values.description);
    if (values.instructions !== undefined) setInstructions(values.instructions ?? '');
    if (values.notes !== undefined) setNotes(values.notes ?? '');
  }

  async function submit() {
    if (disabled) return;
    if (!orderType) return Alert.alert('Orden medica', 'Selecciona el tipo de orden.');
    if (description.trim().length < 5) return Alert.alert('Orden medica', 'Escribe la descripcion de la orden.');
    if (priority === 'urgente' && instructions.trim().length < 5) {
      return Alert.alert('Orden medica', 'Las ordenes urgentes deben incluir instrucciones claras.');
    }
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
      {favoriteOrders?.length ? (
        <View style={styles.favoriteWrap}>
          {favoriteOrders.slice(0, 4).map((favorite, index) => (
            <Pressable disabled={disabled} key={`${favorite.order_type}-${favorite.description}-${index}`} onPress={() => applyOrder(favorite)} style={styles.favorite}>
              <Text numberOfLines={1} style={styles.favoriteText}>{favorite.description}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <AppInput
        editable={!disabled}
        label="Descripcion"
        multiline
        onChangeText={(value) => {
          setDescription(value);
          onSearchOrder?.(value, orderType);
        }}
        value={description}
      />
      {orderCatalog?.length ? (
        <View style={styles.suggestions}>
          {orderCatalog.slice(0, 4).map((item) => (
            <Pressable disabled={disabled} key={item.id} onPress={() => setDescription(item.name ?? item.nombre ?? '')} style={styles.suggestion}>
              <Text style={styles.suggestionTitle}>{item.name ?? item.nombre ?? `Item ${item.id}`}</Text>
              <Text style={styles.suggestionMeta}>{item.sku ? `${item.sku} - ` : ''}{item.category_name ?? item.item_type ?? 'Catalogo'}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <AppInput editable={!disabled} label="Instrucciones" multiline onChangeText={setInstructions} value={instructions} />
      <AppInput editable={!disabled} label="Notas" multiline onChangeText={setNotes} value={notes} />
      <AppButton disabled={disabled} label="Guardar orden medica" loading={submitting} onPress={submit} />
    </AppCard>
  );
}

const styles = StyleSheet.create({
  favorite: { backgroundColor: colors.palePrimary, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  favoriteText: { color: colors.primaryDark, fontSize: 12, fontWeight: '900', maxWidth: 190 },
  favoriteWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  form: { gap: 14 },
  suggestion: { backgroundColor: colors.surfaceMuted, borderColor: colors.border, borderRadius: 12, borderWidth: 1, gap: 2, padding: 9 },
  suggestionMeta: { color: colors.muted, fontSize: 11 },
  suggestionTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  suggestions: { gap: 6 },
});
