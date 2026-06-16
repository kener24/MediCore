import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { colors } from '@/core/theme/colors';
import type { PrescriptionMedicationPayload } from '@/features/doctor/types/doctorPrescription.types';

export function MedicationFormItem({
  index,
  item,
  onRemove,
  onUpdate,
  removable,
}: {
  index: number;
  item: PrescriptionMedicationPayload;
  onRemove: () => void;
  onUpdate: (field: keyof PrescriptionMedicationPayload, value: string) => void;
  removable?: boolean;
}) {
  return (
    <View style={styles.medication}>
      <View style={styles.header}>
        <Text style={styles.subtitle}>Medicamento {index + 1}</Text>
        {removable ? <AppButton label="Eliminar" onPress={onRemove} style={styles.removeButton} variant="danger" /> : null}
      </View>
      <AppInput label="Medicamento" onChangeText={(value) => onUpdate('medication_name', value)} value={item.medication_name} />
      <AppInput label="Dosis" onChangeText={(value) => onUpdate('dosage', value)} value={item.dosage} />
      <AppInput label="Frecuencia" onChangeText={(value) => onUpdate('frequency', value)} value={item.frequency} />
      <AppInput label="Duración" onChangeText={(value) => onUpdate('duration', value)} value={item.duration} />
      <AppInput keyboardType="numeric" label="Cantidad" onChangeText={(value) => onUpdate('quantity', value)} value={String(item.quantity ?? '')} />
      <AppInput label="Indicaciones" multiline onChangeText={(value) => onUpdate('instructions', value)} value={item.instructions ?? ''} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  medication: { borderBottomColor: colors.border, borderBottomWidth: 1, gap: 10, paddingBottom: 14 },
  removeButton: { height: 38, paddingHorizontal: 12 },
  subtitle: { color: colors.ink, fontSize: 15, fontWeight: '900' },
});
