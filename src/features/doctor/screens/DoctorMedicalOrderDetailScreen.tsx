import { useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { formatDateTime } from '@/core/utils/dateUtils';
import { DoctorHeader } from '@/features/doctor/components/DoctorHeader';
import { getMedicalOrderDocuments, shareClinicalDocument, type DoctorClinicalDocument } from '@/features/doctor/services/doctorDocumentsService';
import { cancelMedicalOrder, completeMedicalOrder, getMedicalOrderDetail, reviewMedicalOrder, startMedicalOrder } from '@/features/doctor/services/doctorMedicalOrderService';
import type { DoctorMedicalOrder } from '@/features/doctor/types/doctorMedicalOrder.types';

export function DoctorMedicalOrderDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = useMemo(() => (route.params ?? {}) as { order?: DoctorMedicalOrder; orderId?: number }, [route.params]);
  const [order, setOrder] = useState<DoctorMedicalOrder | null>(params.order ?? null);
  const [documents, setDocuments] = useState<DoctorClinicalDocument[]>([]);
  const [result, setResult] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const orderId = params.orderId ?? params.order?.id;

  const load = useCallback(async () => {
    if (!orderId) { setError('No se encontró la orden médica.'); setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const [detail, docs] = await Promise.all([getMedicalOrderDetail(orderId), getMedicalOrderDocuments(orderId).catch(() => [])]);
      setOrder(detail); setDocuments(docs);
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo cargar la orden médica.'); }
    finally { setLoading(false); }
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  async function run(action: () => Promise<DoctorMedicalOrder>, success: string) {
    if (busy) return;
    setBusy(true);
    try { setOrder(await action()); Alert.alert('Orden médica', success); await load(); }
    catch (err) { Alert.alert('Orden médica', err instanceof Error ? err.message : 'No se pudo completar la acción.'); }
    finally { setBusy(false); }
  }

  if (loading) return <LoadingState label="Cargando orden médica..." />;
  if (error) return <ErrorState message={error} onRetry={load} title="No se pudo cargar la orden" />;

  return <SafeAreaView style={styles.safeArea}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}><DoctorHeader title="Detalle de orden médica" /><AppCard style={styles.card}><Text style={styles.title}>{order?.order_number ?? order?.title ?? 'Orden médica'}</Text><Info label="Estado" value={order?.status ?? 'Registrada'} /><Info label="Prioridad" value={order?.priority ?? 'normal'} /><Info label="Fecha" value={formatDateTime(order?.created_at)} /><Info label="Vencimiento" value={formatDateTime(order?.expires_at)} /><Info label="Área de ejecución" value={order?.execution_area} /><Info label="Descripción" value={order?.description} /><Info label="Instrucciones" value={order?.instructions} /><Info label="Resultado" value={order?.result_summary} /><Info label="Revisión médica" value={order?.review_notes} /></AppCard>{order?.status === 'pendiente' ? <AppCard style={styles.card}><AppButton disabled={busy} label="Iniciar orden" loading={busy} onPress={() => orderId && run(() => startMedicalOrder(orderId), 'Orden iniciada correctamente.')} /><AppInput label="Motivo para cancelar" multiline onChangeText={setCancelReason} value={cancelReason} /><AppButton disabled={busy} label="Cancelar orden" onPress={() => cancelReason.trim().length >= 5 && orderId ? run(() => cancelMedicalOrder(orderId, cancelReason.trim()), 'Orden cancelada correctamente.') : Alert.alert('Orden médica', 'Escribe un motivo de al menos 5 caracteres.')} variant="danger" /></AppCard> : null}{order?.status === 'en_proceso' ? <AppCard style={styles.card}><AppInput label="Resultado resumido" multiline onChangeText={setResult} value={result} /><AppButton disabled={busy} label="Completar orden" loading={busy} onPress={() => result.trim().length >= 3 && orderId ? run(() => completeMedicalOrder(orderId, result.trim()), 'Orden completada correctamente.') : Alert.alert('Orden médica', 'Registra el resultado antes de completar.')} /></AppCard> : null}{order?.status === 'completada' ? <AppCard style={styles.card}><AppInput label="Observación médica" multiline onChangeText={setReviewNotes} value={reviewNotes} /><AppButton disabled={busy} label="Marcar resultado como revisado" loading={busy} onPress={() => orderId && run(() => reviewMedicalOrder(orderId, reviewNotes.trim()), 'Resultado revisado correctamente.')} /></AppCard> : null}<AppCard style={styles.card}><Text style={styles.title}>Resultados y documentos</Text>{documents.length ? documents.map((document) => <View key={document.id ?? document.title} style={styles.document}><Text style={styles.documentTitle}>{document.title ?? document.original_filename ?? 'Documento clínico'}</Text><Text style={styles.documentMeta}>{document.category_nombre ?? document.document_type ?? document.file_extension ?? 'Resultado'}</Text><Text style={styles.documentMeta}>{formatDateTime(document.creado_en ?? document.created_at)}</Text><AppButton label="Abrir documento" onPress={() => shareClinicalDocument(document).catch((err) => Alert.alert('Documento clínico', err instanceof Error ? err.message : 'No se pudo abrir.'))} style={styles.openButton} variant="secondary" /></View>) : <EmptyState description="Cuando el área ejecutora adjunte resultados aparecerán aquí." title="Sin resultados adjuntos" />}</AppCard><AppButton label="Volver" onPress={() => navigation.goBack()} variant="secondary" /></ScrollView></SafeAreaView>;
}

function Info({ label, value }: { label: string; value?: string | null }) { return <View style={styles.info}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value || 'No indicado'}</Text></View>; }

const styles = StyleSheet.create({
  card: { gap: 10 },
  content: { gap: 14, padding: 22, paddingBottom: 128 },
  document: { backgroundColor: colors.surfaceMuted, borderRadius: 8, gap: 4, padding: 10 },
  documentMeta: { color: colors.muted, fontSize: 12 },
  documentTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  info: { gap: 3 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  openButton: { height: 42, marginTop: 4 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  title: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  value: { color: colors.ink, fontSize: 14, lineHeight: 20 },
});
