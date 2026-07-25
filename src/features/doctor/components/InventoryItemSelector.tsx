import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppInput } from '@/components/AppInput';
import { colors } from '@/core/theme/colors';
import type { InventoryItem } from '@/features/doctor/types/doctorClinicalConsumption.types';

export function InventoryItemSelector({
  disabled,
  items,
  onChangeSearch,
  onSelect,
  search,
  selected,
}: {
  disabled?: boolean;
  items: InventoryItem[];
  onChangeSearch: (value: string) => void;
  onSelect: (item: InventoryItem) => void;
  search: string;
  selected?: InventoryItem | null;
}) {
  return (
    <View style={styles.group}>
      <AppInput editable={!disabled} label="Buscar insumo" onChangeText={onChangeSearch} placeholder="Nombre o SKU" value={search} />
      {items.slice(0, 5).map((item) => {
        const active = selected?.id === item.id;
        return (
          <Pressable disabled={disabled} key={item.id} onPress={() => onSelect(item)} style={[styles.item, active && styles.itemActive, disabled && styles.disabled]}>
            <Text style={[styles.name, active && styles.nameActive]}>{item.name ?? item.nombre ?? `Insumo ${item.id}`}</Text>
            <Text style={styles.meta}>Stock: {item.stock_current ?? item.stock ?? 'N/D'} {item.unit ?? item.unidad ?? ''}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  disabled: { opacity: 0.55 },
  item: { backgroundColor: colors.surfaceMuted, borderColor: colors.border, borderRadius: 12, borderWidth: 1, gap: 3, padding: 10 },
  itemActive: { backgroundColor: colors.palePrimary, borderColor: colors.primary },
  meta: { color: colors.muted, fontSize: 12 },
  name: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  nameActive: { color: colors.primaryDark },
});
