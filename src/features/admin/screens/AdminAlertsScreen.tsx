import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { RoleGuard } from '@/components/RoleGuard';
import { colors } from '@/core/theme/colors';
import { getAdminAlerts } from '@/features/admin/services/adminService';
import type { AdminOperationalAlert } from '@/features/admin/types/admin.types';

const filters = [
  { label: 'Todas', value: 'all' },
  { label: 'Críticas', value: 'critical' },
  { label: 'Advertencias', value: 'warning' },
] as const;

export function AdminAlertsScreen() {
  const navigation = useNavigation<any>();
  const [alerts, setAlerts] = useState<AdminOperationalAlert[]>([]);
  const [filter, setFilter] = useState<(typeof filters)[number]['value']>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setAlerts(await getAdminAlerts());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las alertas operativas.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const visible = useMemo(() => alerts.filter((item) => filter === 'all' || item.severity === filter), [alerts, filter]);

  if (loading) return <LoadingState label="Cargando alertas..." />;

  return (
    <RoleGuard roles={['admin']}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
          <AppHeader icon="alert-circle-outline" subtitle="Riesgos reales de operación, seguridad, caja, inventario y fiscal." title="Alertas operativas" />
          <AppButton label="Volver" onPress={() => navigation.goBack()} variant="secondary" />
          {error ? <ErrorState message={error} onRetry={() => void load()} title="Alertas no disponibles" /> : null}
          <View style={styles.filters}>
            {filters.map((item) => (
              <Pressable key={item.value} onPress={() => setFilter(item.value)} style={[styles.chip, filter === item.value && styles.chipActive]}>
                <Text style={[styles.chipText, filter === item.value && styles.chipTextActive]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
          {!error && visible.length === 0 ? <EmptyState description="La clínica no presenta riesgos operativos para este filtro." icon="check-circle-outline" title="Sin alertas pendientes" tone="info" /> : null}
          {visible.map((alert) => (
            <AppCard key={alert.key} style={[styles.card, alert.severity === 'critical' && styles.critical]}>
              <View style={styles.row}>
                <View style={styles.textBlock}>
                  <Text style={styles.title}>{alert.title}</Text>
                  <Text style={styles.meta}>{alert.category.toUpperCase()} · {alert.count} elemento(s)</Text>
                </View>
                <Text style={[styles.badge, alert.severity === 'critical' ? styles.badgeCritical : styles.badgeWarning]}>{alert.severity === 'critical' ? 'Crítica' : 'Revisar'}</Text>
              </View>
              <Text style={styles.detail}>{alert.detail}</Text>
              {!alert.acknowledge_supported ? <Text style={styles.note}>Esta alerta se cerrará automáticamente al corregir su causa.</Text> : null}
            </AppCard>
          ))}
        </ScrollView>
      </SafeAreaView>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 999, fontSize: 11, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 6 },
  badgeCritical: { backgroundColor: '#fee2e2', color: colors.danger },
  badgeWarning: { backgroundColor: '#fef3c7', color: '#92400e' },
  card: { gap: 10 },
  chip: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 9 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  chipTextActive: { color: colors.white },
  content: { gap: 14, padding: 18, paddingBottom: 120 },
  critical: { borderColor: '#fecaca' },
  detail: { color: colors.ink, fontSize: 14, lineHeight: 20 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  meta: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  note: { color: colors.muted, fontSize: 12, fontStyle: 'italic' },
  row: { alignItems: 'flex-start', flexDirection: 'row', gap: 10 },
  safe: { backgroundColor: colors.background, flex: 1 },
  textBlock: { flex: 1, gap: 4 },
  title: { color: colors.ink, fontSize: 15, fontWeight: '900' },
});
