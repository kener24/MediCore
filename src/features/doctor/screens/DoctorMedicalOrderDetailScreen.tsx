import { useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { formatDateTime } from '@/core/utils/dateUtils';
import { DoctorHeader } from '@/features/doctor/components/DoctorHeader';
import { getMedicalOrderDocuments, type DoctorClinicalDocument } from '@/features/doctor/services/doctorDocumentsService';
import { getMedicalOrderDetail } from '@/features/doctor/services/doctorMedicalOrderService';
import type { DoctorMedicalOrder } from '@/features/doctor/types/doctorMedicalOrder.types';

export function DoctorMedicalOrderDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = useMemo(() => (route.params ?? {}) as { order?: DoctorMedicalOrder; orderId?: number }, [route.params]);
  const [order, setOrder] = useState<DoctorMedicalOrder | null>(params.order ?? null);
  const [documents, setDocuments] = useState<DoctorClinicalDocument[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(params.orderId && !params.order));

  const orderId = params.orderId ?? params.order?.id;

  const load = useCallback(async () => {
    if (!orderId) {
      setError('No se encontró la orden médica.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [detail, docs] = await Promise.all([
        getMedicalOrderDetail(orderId),
        getMedicalOrderDocuments(orderId).catch(() => []),
      ]);
      setOrder(detail);
      setDocuments(docs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la orden médica.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState label="Cargando orden médica..." />;
  if (error) return <ErrorState message={error} onRetry={load} title="No se pudo cargar la orden" />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <DoctorHeader title="Detalle de orden médica" />
        <AppCard style={styles.card}>
          <Text style={styles.title}>{order?.order_type ?? 'Orden médica'}</Text>
          <Info label="Estado" value={order?.status ?? 'Registrada'} />
          <Info label="Prioridad" value={order?.priority ?? 'normal'} />
          <Info label="Fecha" value={formatDateTime(order?.created_at)} />
          <Info label="Descripcion" value={order?.description} />
          <Info label="Instrucciones" value={order?.instructions} />
          <Info label="Notas" value={order?.notes} />
        </AppCard>
        <AppCard style={styles.card}>
          <Text style={styles.title}>Resultados y documentos</Text>
          {documents.length ? (
            documents.map((document) => (
              <View key={document.id ?? document.title} style={styles.document}>
                <Text style={styles.documentTitle}>{document.title ?? document.original_filename ?? 'Documento clínico'}</Text>
                <Text style={styles.documentMeta}>{document.category_name ?? document.document_type ?? document.file_extension ?? 'Resultado'}</Text>
                <Text style={styles.documentMeta}>{formatDateTime(document.creado_en ?? document.created_at)}</Text>
                {document.preview_url || document.download_url ? (
                  <AppButton
                    label="Abrir documento"
                    onPress={() => Linking.openURL(document.preview_url ?? document.download_url ?? '')}
                    style={styles.openButton}
                    variant="secondary"
                  />
                ) : null}
              </View>
            ))
          ) : (
            <EmptyState description="Cuando laboratorio o imagen adjunte resultados aparecerán aquí." title="Sin resultados adjuntos" />
          )}
        </AppCard>
        <AppButton label="Volver" onPress={() => navigation.goBack()} variant="secondary" />
      </ScrollView>
    </SafeAreaView>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.info}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || 'No indicado'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  content: { gap: 14, padding: 22, paddingBottom: 128 },
  document: { backgroundColor: colors.surfaceMuted, borderRadius: 12, gap: 4, padding: 10 },
  documentMeta: { color: colors.muted, fontSize: 12 },
  documentTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  info: { gap: 3 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  openButton: { height: 42, marginTop: 4 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  title: { color: colors.ink, fontSize: 18, fontWeight: '900', textTransform: 'capitalize' },
  value: { color: colors.ink, fontSize: 14, lineHeight: 20 },
});
