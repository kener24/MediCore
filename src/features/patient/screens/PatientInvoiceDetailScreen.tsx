import { useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { StatusBadge } from '@/components/StatusBadge';
import { colors } from '@/core/theme/colors';
import { formatDate } from '@/core/utils/dateUtils';
import { toPositiveId } from '@/core/utils/idUtils';
import { formatCurrency } from '@/core/utils/moneyUtils';
import { getPatientInvoice, sharePatientCreditNotePdf, sharePatientInvoicePdf } from '@/features/patient/services/patientInvoicesService';
import type { PatientInvoice } from '@/features/patient/types/patientInvoices.types';

export function PatientInvoiceDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const id = toPositiveId(((route.params ?? {}) as { id?: number | string }).id);
  const [invoice, setInvoice] = useState<PatientInvoice | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingPdf, setLoadingPdf] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    if (!id) { setError('No se encontró la factura solicitada.'); setLoading(false); return; }
    try { setInvoice(await getPatientInvoice(id)); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo cargar la factura.'); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  if (loading) return <LoadingState label="Cargando factura..." />;
  if (error || !invoice) return <ErrorState message={error || 'No hay información disponible.'} onRetry={load} />;

  async function openPdf() {
    if (!invoice) return;
    setLoadingPdf(true);
    try { await sharePatientInvoicePdf(invoice.id, invoice.invoice_number); }
    catch (err) { Alert.alert('Factura', err instanceof Error ? err.message : 'No se pudo abrir el PDF.'); }
    finally { setLoadingPdf(false); }
  }

  return <SafeAreaView style={styles.safeArea}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <AppButton label="Volver" onPress={() => navigation.goBack()} variant="secondary" />
    <AppCard style={styles.card}>
      <StatusBadge label={invoice.status_display} status={invoice.status} />
      <Text style={styles.title}>{invoice.invoice_number || `Factura #${invoice.id}`}</Text>
      <Text style={styles.meta}>{invoice.is_fiscal ? `Factura fiscal ${invoice.fiscal_number || ''}` : 'Factura no fiscal'}</Text>
      <Detail label="Fecha" value={formatDate(invoice.issue_date || invoice.created_at)} />
      <Detail label="Clínica" value={invoice.clinic_nombre || invoice.clinic_name} />
      <Detail label="Paciente" value={invoice.patient_name} />
      <Detail label="Subtotal" value={formatCurrency(invoice.subtotal)} />
      <Detail label="Descuentos" value={formatCurrency(invoice.discount_amount)} />
      <Detail label="Impuestos" value={formatCurrency(invoice.tax_amount)} />
      <Detail label="Total" value={formatCurrency(invoice.total_amount ?? invoice.total)} />
      <Detail label="Pagado" value={formatCurrency(invoice.paid_amount)} />
      <Detail label="Saldo" value={formatCurrency(invoice.balance_due ?? invoice.balance)} />
    </AppCard>

    <Text style={styles.sectionTitle}>Conceptos</Text>
    {invoice.items?.length ? invoice.items.map((item, index) => <AppCard key={`${item.id ?? index}-${item.description}`}>
      <Text style={styles.itemTitle}>{item.description || item.item_name || item.service_name || 'Concepto'}</Text>
      <Text style={styles.meta}>Cantidad {item.quantity || '1'} · {formatCurrency(item.line_total ?? item.total)}</Text>
    </AppCard>) : <EmptyState title="Sin conceptos" description="La factura no tiene conceptos visibles." />}

    <Text style={styles.sectionTitle}>Pagos</Text>
    {invoice.payments?.length ? invoice.payments.map((payment, index) => <AppCard key={`${payment.id ?? index}-${payment.payment_number}`}>
      <Text style={styles.itemTitle}>{payment.payment_number || 'Pago'}</Text>
      <Text style={styles.meta}>{formatDate(payment.payment_date)} · {formatCurrency(payment.amount)}</Text>
      <Text style={styles.meta}>{payment.status_display || payment.status || 'Aplicado'}{payment.reference_visible ? ` · ${payment.reference_visible}` : ''}</Text>
    </AppCard>) : <EmptyState title="Sin pagos" description="No hay pagos registrados para esta factura." />}

    {invoice.related_credit_note ? <AppCard style={styles.card}>
      <Text style={styles.sectionTitle}>Nota de crédito</Text>
      <Text style={styles.itemTitle}>{invoice.related_credit_note.credit_note_number || `Nota #${invoice.related_credit_note.id}`}</Text>
      <Text style={styles.meta}>{invoice.related_credit_note.reason || 'Sin motivo informado'} · {formatCurrency(invoice.related_credit_note.total_amount)}</Text>
      <AppButton label="Abrir nota de crédito" onPress={() => void sharePatientCreditNotePdf(invoice.related_credit_note!.id, invoice.related_credit_note!.credit_note_number)} variant="secondary" />
    </AppCard> : null}
    <AppButton disabled={invoice.pdf_available === false} label={invoice.pdf_available === false ? 'PDF no disponible' : 'Abrir factura PDF'} loading={loadingPdf} onPress={openPdf} />
  </ScrollView></SafeAreaView>;
}

function Detail({ label, value }: { label: string; value?: string | number | null }) {
  return <View style={styles.detail}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value || 'No indicado'}</Text></View>;
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  content: { gap: 14, padding: 22, paddingBottom: 36 },
  detail: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  detailLabel: { color: colors.muted, fontSize: 13, fontWeight: '800' },
  detailValue: { color: colors.ink, flex: 1, fontSize: 14, fontWeight: '900', textAlign: 'right' },
  itemTitle: { color: colors.ink, fontSize: 15, fontWeight: '900' },
  meta: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  title: { color: colors.ink, fontSize: 22, fontWeight: '900' },
});
