import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { AppInput } from '@/components/AppInput';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { StatusBadge } from '@/components/StatusBadge';
import { colors } from '@/core/theme/colors';
import { formatDateTime } from '@/core/utils/dateUtils';
import { administerMedication, delayMedication, getMedicationAdministrations, omitMedication } from '@/features/nurse/hospitalization/services/nurseHospitalizationService';
import type { MedicationAdministration } from '@/features/nurse/hospitalization/types/nurseHospitalization.types';

export function NurseMedicationAdministrationsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const hospitalizationId = Number(route.params?.hospitalizationId);
  const [items, setItems] = useState<MedicationAdministration[]>([]);
  const [selected, setSelected] = useState<MedicationAdministration | null>(null);
  const [action, setAction] = useState<'omit' | 'delay' | null>(null);
  const [actionText, setActionText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try { setItems(await getMedicationAdministrations(hospitalizationId)); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudieron cargar los medicamentos.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [hospitalizationId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function administer(item: MedicationAdministration) {
    if (!item.id) return;
    Alert.alert('Administrar medicamento', '¿Confirmas que administraste este medicamento?', [
      { style: 'cancel', text: 'Cancelar' },
      { text: 'Confirmar', onPress: async () => { await administerMedication(item.id!); await load(true); } },
    ]);
  }

  async function submitAction() {
    if (!selected?.id || !action) return;
    if (action === 'omit' && actionText.trim().length < 3) {
      Alert.alert('Medicamento', 'El motivo de omisión es obligatorio.');
      return;
    }
    try {
      if (action === 'omit') await omitMedication(selected.id, { reason: actionText.trim() });
      if (action === 'delay') await delayMedication(selected.id, { notes: actionText.trim() });
      setSelected(null); setAction(null); setActionText('');
      await load(true);
    } catch (err) {
      Alert.alert('Medicamento', err instanceof Error ? err.message : 'No se pudo actualizar el medicamento.');
    }
  }

  if (loading) return <LoadingState label="Cargando medicamentos..." />;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
        <AppHeader icon="pill" subtitle="Administración hospitalaria de medicamentos." title="Medicamentos" />
        <AppButton label="Programar medicamento" onPress={() => navigation.navigate('NurseMedicationAdministrationForm', { hospitalizationId })} />
        {error ? <ErrorState message={error} onRetry={() => void load()} title="No se pudieron cargar medicamentos" /> : null}
        {!error && items.length === 0 ? <EmptyState description="No hay medicamentos programados." title="Sin medicamentos" /> : null}
        {items.map((item) => <MedicationCard item={item} key={item.id ?? item.medication_name} onAdminister={() => administer(item)} onDelay={() => { setSelected(item); setAction('delay'); }} onOmit={() => { setSelected(item); setAction('omit'); }} />)}
        {selected && action ? (
          <AppCard style={styles.card}>
            <Text style={styles.title}>{action === 'omit' ? 'Motivo de omisión' : 'Nota de retraso'}</Text>
            <AppInput label={action === 'omit' ? 'Motivo obligatorio' : 'Nota'} onChangeText={setActionText} value={actionText} />
            <AppButton label={action === 'omit' ? 'Omitir medicamento' : 'Retrasar medicamento'} onPress={submitAction} variant={action === 'omit' ? 'danger' : 'secondary'} />
          </AppCard>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

export function MedicationCard({ item, onAdminister, onDelay, onOmit }: { item: MedicationAdministration; onAdminister?: () => void; onDelay?: () => void; onOmit?: () => void }) {
  const locked = ['administered', 'omitted', 'cancelled'].includes(String(item.status));
  return (
    <AppCard style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.title}>{item.medication_name || 'Medicamento'}</Text>
        <StatusBadge status={item.status} />
      </View>
      <Text style={styles.description}>Dosis: {item.dosage || '-'} · Vía: {routeLabel(item.route)}</Text>
      <Text style={styles.description}>Programado: {formatDateTime(item.scheduled_time, 'Sin hora programada')}</Text>
      {item.administered_by_name ? <Text style={styles.description}>Enfermera: {item.administered_by_name}</Text> : null}
      {item.notes ? <Text style={styles.description}>{item.notes}</Text> : null}
      {item.omission_reason ? <Text style={styles.description}>Omisión: {item.omission_reason}</Text> : null}
      {!locked ? <View style={styles.actions}><AppButton label="Administrar" onPress={onAdminister} /><AppButton label="Retrasar" onPress={onDelay} variant="secondary" /><AppButton label="Omitir" onPress={onOmit} variant="danger" /></View> : null}
    </AppCard>
  );
}

function routeLabel(route?: string) {
  const labels: Record<string, string> = { im: 'IM', inhaled: 'Inhalada', iv: 'IV', oral: 'Oral', other: 'Otra', sc: 'SC', topical: 'Tópica' };
  return labels[String(route ?? '')] ?? 'No registrada';
}

const styles = StyleSheet.create({
  actions: { gap: 8 },
  card: { gap: 10 },
  content: { gap: 14, padding: 18, paddingBottom: 130 },
  description: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  rowBetween: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  safe: { backgroundColor: colors.background, flex: 1 },
  title: { color: colors.ink, fontSize: 16, fontWeight: '900' },
});
