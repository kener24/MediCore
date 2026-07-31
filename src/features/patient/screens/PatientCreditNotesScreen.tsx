import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { StatusBadge } from '@/components/StatusBadge';
import { colors } from '@/core/theme/colors';
import { formatDate } from '@/core/utils/dateUtils';
import { formatCurrency } from '@/core/utils/moneyUtils';
import { getPatientCreditNotes, sharePatientCreditNotePdf } from '@/features/patient/services/patientInvoicesService';
import type { PatientCreditNote } from '@/features/patient/types/patientInvoices.types';

export function PatientCreditNotesScreen() {
  const navigation = useNavigation();
  const [items, setItems] = useState<PatientCreditNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [openingId, setOpeningId] = useState<number | null>(null);
  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try { setItems(await getPatientCreditNotes()); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudieron cargar las notas de crédito.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  async function openPdf(note: PatientCreditNote) {
    setOpeningId(note.id);
    try { await sharePatientCreditNotePdf(note.id, note.credit_note_number); }
    catch (err) { Alert.alert('Nota de crédito', err instanceof Error ? err.message : 'No se pudo abrir el PDF.'); }
    finally { setOpeningId(null); }
  }
  if (loading) return <LoadingState label="Cargando notas de crédito..." />;
  return <SafeAreaView style={styles.safeArea}><ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}>
    <AppButton label="Volver" onPress={() => navigation.goBack()} variant="secondary" />
    <Text style={styles.title}>Notas de crédito</Text>
    <Text style={styles.subtitle}>Documentos de anulación o ajuste emitidos sobre tus facturas.</Text>
    {error ? <ErrorState message={error} onRetry={() => void load()} /> : items.length ? items.map((note) => <AppCard key={note.id} style={styles.card}>
      <StatusBadge label={note.status_display || note.status} status={note.status} />
      <Text style={styles.number}>{note.credit_note_number || `Nota #${note.id}`}</Text>
      <Text style={styles.meta}>Factura: {note.original_invoice_number || 'No indicada'}</Text>
      <Text style={styles.meta}>Fecha: {formatDate(note.issue_date)}</Text>
      <Text style={styles.amount}>{formatCurrency(note.total_amount)}</Text>
      <Text style={styles.reason}>{note.reason || 'Sin motivo informado'}</Text>
      <AppButton label="Abrir PDF" loading={openingId === note.id} onPress={() => void openPdf(note)} variant="secondary" />
    </AppCard>) : <EmptyState title="Sin notas de crédito" description="No tienes notas de crédito emitidas." />}
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  amount: { color: colors.primaryDark, fontSize: 20, fontWeight: '900' },
  card: { gap: 8 },
  content: { gap: 14, padding: 22, paddingBottom: 36 },
  meta: { color: colors.muted, fontSize: 13 },
  number: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  reason: { color: colors.ink, fontSize: 14, lineHeight: 20 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  title: { color: colors.ink, fontSize: 26, fontWeight: '900' },
});
