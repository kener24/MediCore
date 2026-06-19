import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { formatDateTime } from '@/core/utils/dateUtils';
import { getNursingRounds } from '@/features/nurse/hospitalization/services/nurseHospitalizationService';
import type { NursingRound } from '@/features/nurse/hospitalization/types/nurseHospitalization.types';

const roundLabels: Record<string, string> = { follow_up: 'Seguimiento', medication: 'Medicamento', other: 'Otro', routine: 'Rutina', urgent: 'Urgente' };

export function NurseNursingRoundsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const hospitalizationId = Number(route.params?.hospitalizationId);
  const [items, setItems] = useState<NursingRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try { setItems(await getNursingRounds(hospitalizationId)); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudieron cargar las rondas.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [hospitalizationId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading) return <LoadingState label="Cargando rondas..." />;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
        <AppHeader icon="clipboard-pulse-outline" subtitle="Revisiones de enfermería del internamiento." title="Rondas de enfermería" />
        <AppButton label="Nueva ronda" onPress={() => navigation.navigate('NurseNursingRoundForm', { hospitalizationId })} />
        {error ? <ErrorState message={error} onRetry={() => void load()} title="No se pudieron cargar las rondas" /> : null}
        {!error && items.length === 0 ? <EmptyState description="No hay rondas de enfermería registradas." title="Sin rondas" /> : null}
        {items.map((item) => <RoundCard item={item} key={item.id ?? item.created_at} />)}
      </ScrollView>
    </SafeAreaView>
  );
}

function RoundCard({ item }: { item: NursingRound }) {
  return (
    <AppCard style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.title}>{roundLabels[String(item.round_type)] ?? 'Ronda'}</Text>
        <Text style={styles.small}>{formatDateTime(item.created_at ?? item.creado_en)}</Text>
      </View>
      <Text style={styles.description}>Condición: {item.general_condition || 'No registrada'} · Dolor: {item.pain_level ?? '-'}</Text>
      <Text style={styles.description}>Conciencia: {item.consciousness_status || '-'} · Movilidad: {item.mobility_status || '-'}</Text>
      {item.notes ? <Text style={styles.description}>{item.notes}</Text> : null}
      <Text style={styles.small}>{item.nurse_name || 'Enfermería'}</Text>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  content: { gap: 14, padding: 18, paddingBottom: 110 },
  description: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  rowBetween: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  safe: { backgroundColor: colors.background, flex: 1 },
  small: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  title: { color: colors.ink, fontSize: 16, fontWeight: '900' },
});
