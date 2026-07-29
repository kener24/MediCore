import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { toPositiveId } from '@/core/utils/idUtils';
import { createHospitalizationEvent, getHospitalTimeline } from '@/features/nurse/hospitalization/services/nurseHospitalizationService';
import type { HospitalTimelineEntry } from '@/features/nurse/hospitalization/types/nurseHospitalization.types';

export function NurseHospitalizationEventsScreen() {
  const route = useRoute<any>();
  const hospitalizationId = toPositiveId(route.params?.hospitalizationId);
  const [items, setItems] = useState<HospitalTimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'info' | 'warning' | 'critical'>('info');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (!hospitalizationId) {
      setError('No se encontró el internamiento.');
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setItems(await getHospitalTimeline(hospitalizationId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los eventos de hospitalización.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hospitalizationId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function saveEvent() {
    if (!hospitalizationId || description.trim().length < 5) {
      Alert.alert('Evento clínico', 'Describe el evento con al menos 5 caracteres.');
      return;
    }
    setSaving(true);
    try {
      await createHospitalizationEvent(hospitalizationId, { description: description.trim(), event_type: 'nursing_event', severity });
      setDescription('');
      setSeverity('info');
      await load(true);
    } catch (err) {
      Alert.alert('Evento clínico', err instanceof Error ? err.message : 'No se pudo registrar el evento.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Cargando eventos..." />;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
        <AppHeader icon="timeline-clock-outline" subtitle="Timeline del internamiento." title="Eventos de hospitalización" />
        <AppCard style={styles.formCard}>
          <Text style={styles.sectionTitle}>Registrar evento clínico</Text>
          <AppInput label="Descripción" multiline numberOfLines={3} onChangeText={setDescription} value={description} />
          <View style={styles.severityRow}>{(['info', 'warning', 'critical'] as const).map((value) => <Pressable key={value} onPress={() => setSeverity(value)} style={[styles.severityButton, severity === value && styles.severitySelected]}><Text style={[styles.severityText, severity === value && styles.severityTextSelected]}>{value === 'info' ? 'Informativo' : value === 'warning' ? 'Advertencia' : 'Crítico'}</Text></Pressable>)}</View>
          <AppButton label="Registrar evento" loading={saving} onPress={() => void saveEvent()} />
        </AppCard>
        {error ? <ErrorState message={error} onRetry={() => void load()} title="No se pudieron cargar los eventos" /> : null}
        {!error && items.length === 0 ? <EmptyState description="No hay eventos registrados." title="Sin eventos" /> : null}
        {items.map((item) => <AppCard key={item.id} style={styles.timelineCard}><View style={styles.row}><Text style={styles.eventTitle}>{item.title}</Text><Text style={item.severity === 'critical' ? styles.critical : styles.date}>{new Date(item.occurred_at).toLocaleString('es-HN')}</Text></View><Text style={styles.description}>{item.description}</Text><Text style={styles.date}>{item.user || 'Sistema'}</Text></AppCard>)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 18, paddingBottom: 110 },
  critical: { color: colors.danger, fontSize: 11, fontWeight: '900' },
  date: { color: colors.muted, fontSize: 11 },
  description: { color: colors.ink, fontSize: 14, lineHeight: 20 },
  eventTitle: { color: colors.ink, flex: 1, fontSize: 15, fontWeight: '900' },
  formCard: { gap: 12 },
  row: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  safe: { backgroundColor: colors.background, flex: 1 },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: '900' },
  severityButton: { borderColor: colors.border, borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 9 },
  severityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  severitySelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  severityText: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  severityTextSelected: { color: colors.white },
  timelineCard: { borderLeftColor: colors.primary, borderLeftWidth: 4, gap: 6 },
});
