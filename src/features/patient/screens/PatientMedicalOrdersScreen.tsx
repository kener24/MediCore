import { useFocusEffect, useNavigation, type NavigationProp, type ParamListBase } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppCard } from '@/components/AppCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { StatusBadge } from '@/components/StatusBadge';
import { colors } from '@/core/theme/colors';
import { formatDate } from '@/core/utils/dateUtils';
import { PatientHeader } from '@/features/patient/components/PatientHeader';
import { getPatientMedicalOrders } from '@/features/patient/services/patientMedicalOrdersService';
import type { PatientMedicalOrder } from '@/features/patient/types/patientMedicalOrders.types';

type Filter = 'all' | 'pending' | 'completed';

export function PatientMedicalOrdersScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [orders, setOrders] = useState<PatientMedicalOrder[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setOrders(await getPatientMedicalOrders());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las ordenes.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const visibleOrders = useMemo(
    () =>
      orders.filter((order) => {
        if (filter === 'all') return true;
        if (filter === 'pending') return ['pending', 'pendiente', 'ordered'].includes(String(order.status));
        return ['completed', 'completada', 'cancelled', 'cancelada'].includes(String(order.status));
      }),
    [filter, orders],
  );

  if (loading) return <LoadingState label="Cargando ordenes..." />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => load(true)} refreshing={refreshing} />}
        showsVerticalScrollIndicator={false}>
        <PatientHeader subtitle="Laboratorio, imagenes y solicitudes medicas." title="Ordenes medicas" />
        <View style={styles.filters}>
          <Chip active={filter === 'all'} label="Todas" onPress={() => setFilter('all')} />
          <Chip active={filter === 'pending'} label="Pendientes" onPress={() => setFilter('pending')} />
          <Chip active={filter === 'completed'} label="Finalizadas" onPress={() => setFilter('completed')} />
        </View>
        {error ? (
          <ErrorState message={error} onRetry={() => load()} title="No se pudieron cargar las ordenes" />
        ) : visibleOrders.length ? (
          visibleOrders.map((order) => (
            <Pressable key={order.id} onPress={() => navigation.navigate('PatientMedicalOrderDetail', { id: order.id })}>
              <AppCard style={styles.card}>
                <StatusBadge status={order.status} />
                <Text style={styles.title}>{order.title || order.order_number || 'Orden medica'}</Text>
                <Text style={styles.meta}>{order.order_type || 'Tipo no indicado'} · {order.priority || 'Prioridad normal'}</Text>
                <Text style={styles.meta}>{formatDate(order.creado_en || order.actualizado_en)}</Text>
                <Text style={styles.description} numberOfLines={2}>{order.description || order.instructions || 'Sin indicaciones adicionales.'}</Text>
              </AppCard>
            </Pressable>
          ))
        ) : (
          <EmptyState description="No tienes ordenes medicas registradas." title="Sin ordenes" />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Chip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.activeChip]}>
      <Text style={[styles.chipText, active && styles.activeChipText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  activeChip: { backgroundColor: colors.primary },
  activeChipText: { color: colors.white },
  card: { gap: 8 },
  chip: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  chipText: { color: colors.muted, fontSize: 13, fontWeight: '900' },
  content: { gap: 12, padding: 22, paddingBottom: 34 },
  description: { color: colors.ink, fontSize: 14, lineHeight: 20 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  meta: { color: colors.muted, fontSize: 13 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  title: { color: colors.ink, fontSize: 17, fontWeight: '900' },
});
