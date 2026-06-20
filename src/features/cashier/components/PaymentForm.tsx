import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { colors } from '@/core/theme/colors';
import type { PaymentMethod } from '@/features/cashier/types/cashierPayment.types';

export const paymentMethods: { label: string; value: PaymentMethod }[] = [
  { label: 'Efectivo', value: 'cash' },
  { label: 'Tarjeta', value: 'card' },
  { label: 'Transferencia', value: 'transfer' },
  { label: 'Dinero móvil', value: 'mobile_money' },
  { label: 'Cheque', value: 'check' },
  { label: 'Otro', value: 'other' },
];

export function PaymentForm({
  amount,
  loading,
  method,
  notes,
  onChangeAmount,
  onChangeMethod,
  onChangeNotes,
  onChangeReference,
  onSubmit,
  reference,
}: {
  amount: string;
  loading?: boolean;
  method: PaymentMethod;
  notes: string;
  onChangeAmount: (value: string) => void;
  onChangeMethod: (value: PaymentMethod) => void;
  onChangeNotes: (value: string) => void;
  onChangeReference: (value: string) => void;
  onSubmit: () => void;
  reference: string;
}) {
  return (
    <View style={styles.form}>
      <AppInput keyboardType="decimal-pad" label="Monto" onChangeText={(value) => onChangeAmount(value.replace(/[^0-9.]/g, ''))} value={amount} />
      <Text style={styles.label}>Método de pago</Text>
      <View style={styles.methods}>
        {paymentMethods.map((item) => (
          <Pressable key={item.value} onPress={() => onChangeMethod(item.value)} style={[styles.method, method === item.value && styles.methodActive]}>
            <Text style={[styles.methodText, method === item.value && styles.methodTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
      <AppInput label="Referencia" onChangeText={onChangeReference} value={reference} />
      <AppInput label="Notas" multiline onChangeText={onChangeNotes} scrollEnabled={false} style={styles.textArea} value={notes} />
      <AppButton label="Registrar pago" loading={loading} onPress={onSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14 },
  label: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  method: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  methodActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  methodText: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  methodTextActive: { color: colors.white },
  methods: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  textArea: { minHeight: 92, textAlignVertical: 'top' },
});
