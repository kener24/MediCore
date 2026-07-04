import { useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { StatusBadge } from '@/components/StatusBadge';
import { colors } from '@/core/theme/colors';
import { formatDateTime } from '@/core/utils/dateUtils';
import { getPatientMedicalOrder } from '@/features/patient/services/patientMedicalOrdersService';
import type { PatientMedicalOrder } from '@/features/patient/types/patientMedicalOrders.types';

export function PatientMedicalOrderDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const routeParams = (route.params ?? {}) as { id?: number | string };
  const id = Number(routeParams.id);
  const hasValidId = Number.isFinite(id) && id > 0;
  const [order, setOrder] = useState<PatientMedicalOrder | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    if (!hasValidId) {
      setError('No se encontro la orden solicitada.');
      setLoading(false);
      return;
    }
    try {
      setOrder(await getPatientMedicalOrder(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la orden.');
    } finally {
      setLoading(false);
    }
  }, [hasValidId, id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingState label="Cargando orden..." />;
  if (error || !order) return <ErrorState message={error || 'No hay informacion disponible.'} onRetry={load} />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppButton label="Volver" onPress={() => navigation.goBack()} variant="secondary" />
        <AppCard style={styles.card}>
          <StatusBadge status={order.status} />
          <Text style={styles.title}>{order.title || order.order_number || 'Orden medica'}</Text>
          <Detail label="Numero" value={order.order_number} />
          <Detail label="Tipo" value={order.order_type} />
          <Detail label="Prioridad" value={order.priority} />
          <Detail label="Medico" value={order.doctor_nombre} />
          <Detail label="Fecha" value={formatDateTime(order.creado_en || order.actualizado_en)} />
        </AppCard>
        <AppCard style={styles.card}>
          <Text style={styles.sectionTitle}>Indicaciones</Text>
          <Text style={styles.text}>{order.description || order.instructions || 'Sin indicaciones adicionales.'}</Text>
        </AppCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function Detail({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value ? String(value) : 'No indicado'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  content: { gap: 14, padding: 22, paddingBottom: 34 },
  detail: { gap: 3 },
  detailLabel: { color: colors.muted, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  detailValue: { color: colors.ink, fontSize: 14, lineHeight: 20 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: '900' },
  text: { color: colors.ink, fontSize: 14, lineHeight: 21 },
  title: { color: colors.ink, fontSize: 22, fontWeight: '900' },
});
