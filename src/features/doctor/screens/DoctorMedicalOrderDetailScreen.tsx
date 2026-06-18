import { useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { formatDateTime } from '@/core/utils/dateUtils';
import { DoctorHeader } from '@/features/doctor/components/DoctorHeader';
import { getMedicalOrderDetail } from '@/features/doctor/services/doctorMedicalOrderService';
import type { DoctorMedicalOrder } from '@/features/doctor/types/doctorMedicalOrder.types';

export function DoctorMedicalOrderDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = useMemo(() => (route.params ?? {}) as { order?: DoctorMedicalOrder; orderId?: number }, [route.params]);
  const [order, setOrder] = useState<DoctorMedicalOrder | null>(params.order ?? null);
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
      setOrder(await getMedicalOrderDetail(orderId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la orden médica.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (!params.order) load();
  }, [load, params.order]);

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
          <Info label="Descripción" value={order?.description} />
          <Info label="Instrucciones" value={order?.instructions} />
          <Info label="Notas" value={order?.notes} />
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
  info: { gap: 3 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  title: { color: colors.ink, fontSize: 18, fontWeight: '900', textTransform: 'capitalize' },
  value: { color: colors.ink, fontSize: 14, lineHeight: 20 },
});
