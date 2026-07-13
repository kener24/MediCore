import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { colors } from '@/core/theme/colors';
import type { PaymentMethod } from '@/features/cashier/types/cashierPayment.types';

export const paymentMethods: { label: string; value: PaymentMethod }[] = [
  { label: 'Efectivo', value: 'efectivo' },
  { label: 'Tarjeta', value: 'tarjeta' },
  { label: 'Transferencia', value: 'transferencia' },
  { label: 'Depósito', value: 'deposito' },
  { label: 'Cheque', value: 'cheque' },
  { label: 'Otro', value: 'otro' },
];

type PaymentFormProps = {
  amount: string;
  balanceLabel?: string;
  loading?: boolean;
  method: PaymentMethod;
  notes: string;
  onChangeAmount: (value: string) => void;
  onChangeMethod: (value: PaymentMethod) => void;
  onChangeNotes: (value: string) => void;
  onChangeReference: (value: string) => void;
  onFillBalance?: () => void;
  onSubmit: () => void;
  reference: string;
  referenceRequired?: boolean;
};

export function PaymentForm({
  amount,
  balanceLabel,
  loading,
  method,
  notes,
  onChangeAmount,
  onChangeMethod,
  onChangeNotes,
  onChangeReference,
  onFillBalance,
  onSubmit,
  reference,
  referenceRequired,
}: PaymentFormProps) {
  const selectedMethod = paymentMethods.find((item) => item.value === method)?.label ?? 'Método seleccionado';

  return (
    <View style={styles.form}>
      <View style={styles.amountHeader}>
        <View style={styles.amountCopy}>
          <Text style={styles.label}>Monto</Text>
          {balanceLabel ? <Text style={styles.hint}>Saldo pendiente: {balanceLabel}</Text> : null}
        </View>
        {onFillBalance ? <Text onPress={onFillBalance} style={styles.fullBalance}>Pagar saldo</Text> : null}
      </View>
      <AppInput keyboardType="decimal-pad" label="Monto a registrar" onChangeText={(value) => onChangeAmount(normalizeMoney(value))} value={amount} />
      <Text style={styles.label}>Método de pago</Text>
      <View style={styles.methods}>
        {paymentMethods.map((item) => (
          <Pressable key={item.value} onPress={() => onChangeMethod(item.value)} style={[styles.method, method === item.value && styles.methodActive]}>
            <Text style={[styles.methodText, method === item.value && styles.methodTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.hint}>{referenceRequired ? `${selectedMethod} requiere comprobante, autorización o número de referencia.` : 'En efectivo puedes dejar la referencia vacía.'}</Text>
      <AppInput autoCapitalize="characters" label={referenceRequired ? 'Referencia obligatoria' : 'Referencia opcional'} onChangeText={onChangeReference} value={reference} />
      <AppInput label="Notas" multiline onChangeText={onChangeNotes} scrollEnabled={false} style={styles.textArea} value={notes} />
      <AppButton label="Registrar pago" loading={loading} onPress={onSubmit} />
    </View>
  );
}

function normalizeMoney(value: string) {
  const sanitized = value.replace(/[^0-9.]/g, '');
  const [whole, ...decimals] = sanitized.split('.');
  if (!decimals.length) return whole;
  return `${whole}.${decimals.join('').slice(0, 2)}`;
}

const styles = StyleSheet.create({
  amountCopy: { flex: 1, gap: 3 },
  amountHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  form: { gap: 14 },
  fullBalance: { backgroundColor: colors.surfaceMuted, borderColor: colors.border, borderRadius: 999, borderWidth: 1, color: colors.primary, fontSize: 12, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 8 },
  hint: { color: colors.muted, fontSize: 12, fontWeight: '700', lineHeight: 17 },
  label: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  method: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  methodActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  methodText: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  methodTextActive: { color: colors.white },
  methods: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  textArea: { minHeight: 92, textAlignVertical: 'top' },
});
