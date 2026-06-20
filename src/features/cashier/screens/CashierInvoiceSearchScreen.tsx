import { useNavigation } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { colors } from '@/core/theme/colors';
import { CashierHeader } from '@/features/cashier/components/CashierHeader';
import { InvoiceCard } from '@/features/cashier/components/InvoiceCard';
import { searchInvoices } from '@/features/cashier/services/cashierInvoiceService';
import type { CashierInvoice } from '@/features/cashier/types/cashierInvoice.types';

export function CashierInvoiceSearchScreen() {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CashierInvoice[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const canSearch = useMemo(() => query.trim().length >= 2, [query]);

  async function submit() {
    if (!canSearch) return Alert.alert('Buscar factura', 'Escribe al menos 2 caracteres para buscar.');
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      setResults(await searchInvoices(query.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo buscar facturas.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <CashierHeader subtitle="Busca por número, paciente, identidad o teléfono." title="Buscar factura" />
        <AppInput label="Busqueda" onChangeText={setQuery} onSubmitEditing={submit} placeholder="Factura o paciente" value={query} />
        <AppButton disabled={!canSearch} label="Buscar" loading={loading} onPress={submit} />
        {error ? <ErrorState message={error} onRetry={submit} title="No se pudo buscar facturas" /> : null}
        {!error && searched && results.length === 0 ? <EmptyState description="No se encontraron facturas." title="Sin resultados" /> : null}
        {results.map((invoice) => (
          <InvoiceCard
            invoice={invoice}
            key={invoice.id ?? invoice.invoice_number}
            onPay={() => navigation.navigate('CashierRegisterPayment', { invoiceId: invoice.id })}
            onPress={() => navigation.navigate('CashierInvoiceDetail', { invoiceId: invoice.id })}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 18, paddingBottom: 120 },
  safe: { backgroundColor: colors.background, flex: 1 },
});
