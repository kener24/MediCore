import { useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { CashierHeader } from '@/features/cashier/components/CashierHeader';
import { InvoiceTotalsCard } from '@/features/cashier/components/InvoiceTotalsCard';
import { PaymentForm } from '@/features/cashier/components/PaymentForm';
import { getCurrentCashSession } from '@/features/cashier/services/cashierCashService';
import { getInvoiceDetail } from '@/features/cashier/services/cashierInvoiceService';
import { registerPayment } from '@/features/cashier/services/cashierPaymentService';
import type { CashSession } from '@/features/cashier/types/cashierCash.types';
import type { CashierInvoiceDetail } from '@/features/cashier/types/cashierInvoice.types';
import type { PaymentMethod } from '@/features/cashier/types/cashierPayment.types';
import { formatCurrency, numericValue } from '@/features/cashier/types/commonCashier.types';

export function CashierRegisterPaymentScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = useMemo(() => (route.params ?? {}) as { invoiceId?: number }, [route.params]);
  const [invoice, setInvoice] = useState<CashierInvoiceDetail | null>(null);
  const [cashSession, setCashSession] = useState<CashSession | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('efectivo');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!params.invoiceId) {
      setError('No se encontró la factura.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [data, session] = await Promise.all([getInvoiceDetail(params.invoiceId), getCurrentCashSession()]);
      setInvoice(data);
      setCashSession(session);
      const balance = numericValue(data.balance_due ?? data.balance);
      setAmount(balance > 0 ? balance.toFixed(2) : '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la factura.');
    } finally {
      setLoading(false);
    }
  }, [params.invoiceId]);

  useEffect(() => { void load(); }, [load]);

  async function submit() {
    if (saving) return;
    if (!params.invoiceId || !invoice) return Alert.alert('Pago', 'No se encontró la factura.');
    const validation = validate();
    if (validation) return Alert.alert('Pago', validation);
    setSaving(true);
    try {
      const payment = await registerPayment(params.invoiceId, {
        amount: Number(amount),
        cash_session: method === 'efectivo' ? cashSession?.id : undefined,
        invoice_id: params.invoiceId,
        method,
        notes: notes.trim(),
        reference: reference.trim(),
      });
      Alert.alert('Pago', 'Pago registrado correctamente.', [
        { text: 'Ver factura', onPress: () => navigation.navigate('CashierInvoiceDetail', { invoiceId: params.invoiceId }) },
        { text: 'Ver pago', onPress: () => payment?.id ? navigation.navigate('CashierPaymentDetail', { invoiceId: params.invoiceId, paymentId: payment.id }) : navigation.navigate('CashierInvoiceDetail', { invoiceId: params.invoiceId }) },
      ]);
    } catch (err) {
      Alert.alert('Pago', err instanceof Error ? err.message : 'No se pudo registrar el pago.');
    } finally {
      setSaving(false);
    }
  }

  function validate() {
    const value = Number(amount);
    const balance = numericValue(invoice?.balance_due ?? invoice?.balance);
    if (!Number.isFinite(value)) return 'Ingresa un monto válido.';
    if (value <= 0) return 'El monto debe ser mayor a 0.';
    if (balance > 0 && value > balance) return 'El monto no puede ser mayor al saldo pendiente.';
    if (!method) return 'Selecciona un método de pago.';
    if (method === 'efectivo' && !cashSession?.id) return 'Debes abrir caja antes de registrar pagos en efectivo.';
    if (method !== 'efectivo' && !reference.trim()) return 'La referencia es requerida para este método.';
    return '';
  }

  if (loading) return <LoadingState label="Preparando pago..." />;
  if (error || !invoice) return <ErrorState message={error || 'Factura no disponible.'} onRetry={() => void load()} title="No se puede registrar" />;

  const balance = numericValue(invoice.balance_due ?? invoice.balance);
  const currency = invoice.currency ?? 'L';

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <CashierHeader subtitle="Registra un pago total o parcial." title="Registrar pago" />
          <InvoiceTotalsCard invoice={invoice} />
          <AppCard>
            <PaymentForm
              amount={amount}
              balanceLabel={formatCurrency(balance, currency)}
              loading={saving}
              method={method}
              notes={notes}
              onChangeAmount={setAmount}
              onChangeMethod={(value) => {
                setMethod(value);
                if (value === 'efectivo') setReference('');
              }}
              onChangeNotes={setNotes}
              onChangeReference={setReference}
              onFillBalance={() => setAmount(balance > 0 ? balance.toFixed(2) : '')}
              onSubmit={submit}
              reference={reference}
              referenceRequired={method !== 'efectivo'}
            />
          </AppCard>
          <AppButton label="Cancelar" onPress={() => navigation.goBack()} variant="secondary" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 18, paddingBottom: 140 },
  keyboard: { flex: 1 },
  safe: { backgroundColor: colors.background, flex: 1 },
});
