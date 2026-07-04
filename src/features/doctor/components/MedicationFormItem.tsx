import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { colors } from '@/core/theme/colors';
import type { InventoryItem } from '@/features/doctor/types/doctorClinicalConsumption.types';
import type { PrescriptionMedicationPayload } from '@/features/doctor/types/doctorPrescription.types';

export function MedicationFormItem({
  catalogItems,
  disabled,
  favoriteItems,
  index,
  item,
  onRemove,
  onSearchMedication,
  onSelectCatalogItem,
  onSelectFavorite,
  onUpdate,
  removable,
}: {
  catalogItems?: InventoryItem[];
  disabled?: boolean;
  favoriteItems?: PrescriptionMedicationPayload[];
  index: number;
  item: PrescriptionMedicationPayload;
  onRemove: () => void;
  onSearchMedication?: (value: string) => void;
  onSelectCatalogItem?: (item: InventoryItem) => void;
  onSelectFavorite?: (item: PrescriptionMedicationPayload) => void;
  onUpdate: (field: keyof PrescriptionMedicationPayload, value: string) => void;
  removable?: boolean;
}) {
  return (
    <View style={styles.medication}>
      <View style={styles.header}>
        <Text style={styles.subtitle}>Medicamento {index + 1}</Text>
        {removable ? (
          <AppButton disabled={disabled} label="Eliminar" onPress={onRemove} style={styles.removeButton} variant="danger" />
        ) : null}
      </View>
      <AppInput
        editable={!disabled}
        label="Medicamento"
        onChangeText={(value) => {
          onUpdate('medication_name', value);
          onSearchMedication?.(value);
        }}
        placeholder="Buscar o escribir medicamento"
        value={item.medication_name}
      />
      {catalogItems?.length ? (
        <View style={styles.suggestions}>
          {catalogItems.slice(0, 4).map((catalogItem) => (
            <Pressable disabled={disabled} key={catalogItem.id} onPress={() => onSelectCatalogItem?.(catalogItem)} style={styles.suggestion}>
              <Text style={styles.suggestionTitle}>{catalogItem.name ?? catalogItem.nombre ?? `Medicamento ${catalogItem.id}`}</Text>
              <Text style={styles.suggestionMeta}>
                {catalogItem.sku ? `${catalogItem.sku} - ` : ''}Stock {catalogItem.stock_current ?? catalogItem.stock ?? 'N/D'} {catalogItem.unit ?? catalogItem.unidad ?? ''}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {favoriteItems?.length ? (
        <View style={styles.favoriteWrap}>
          {favoriteItems.slice(0, 4).map((favorite, favoriteIndex) => (
            <Pressable
              disabled={disabled}
              key={`${favorite.medication_name}-${favoriteIndex}`}
              onPress={() => onSelectFavorite?.(favorite)}
              style={styles.favorite}>
              <Text numberOfLines={1} style={styles.favoriteText}>{favorite.medication_name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <AppInput editable={!disabled} label="Dosis" onChangeText={(value) => onUpdate('dosage', value)} value={item.dosage} />
      <AppInput editable={!disabled} label="Frecuencia" onChangeText={(value) => onUpdate('frequency', value)} value={item.frequency} />
      <AppInput editable={!disabled} label="Duracion" onChangeText={(value) => onUpdate('duration', value)} value={item.duration} />
      <AppInput
        editable={!disabled}
        keyboardType="numeric"
        label="Cantidad"
        onChangeText={(value) => onUpdate('quantity', value.replace(/[^0-9.]/g, ''))}
        value={String(item.quantity ?? '')}
      />
      <AppInput editable={!disabled} label="Indicaciones" multiline onChangeText={(value) => onUpdate('instructions', value)} value={item.instructions ?? ''} />
    </View>
  );
}

const styles = StyleSheet.create({
  favorite: { backgroundColor: colors.palePrimary, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  favoriteText: { color: colors.primaryDark, fontSize: 12, fontWeight: '900', maxWidth: 170 },
  favoriteWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  medication: { borderBottomColor: colors.border, borderBottomWidth: 1, gap: 10, paddingBottom: 14 },
  removeButton: { height: 38, paddingHorizontal: 12 },
  subtitle: { color: colors.ink, fontSize: 15, fontWeight: '900' },
  suggestion: { backgroundColor: colors.surfaceMuted, borderColor: colors.border, borderRadius: 12, borderWidth: 1, gap: 2, padding: 9 },
  suggestionMeta: { color: colors.muted, fontSize: 11 },
  suggestionTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  suggestions: { gap: 6 },
});
