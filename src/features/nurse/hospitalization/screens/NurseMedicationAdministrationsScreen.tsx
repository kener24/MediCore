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
import { toPositiveId } from '@/core/utils/idUtils';
import { administerMedication, delayMedication, getMedicationAdministrations, omitMedication } from '@/features/nurse/hospitalization/services/nurseHospitalizationService';
import type { MedicationAdministration } from '@/features/nurse/hospitalization/types/nurseHospitalization.types';

type MedicationAction = 'omit' | 'delay';

export function NurseMedicationAdministrationsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const hospitalizationId = toPositiveId(route.params?.hospitalizationId);
  const [items, setItems] = useState<MedicationAdministration[]>([]);
  const [selected, setSelected] = useState<MedicationAdministration | null>(null);
  const [action, setAction] = useState<MedicationAction | null>(null);
  const [actionText, setActionText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [workingId, setWorkingId] = useState<number | string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (!hospitalizationId) {
      setError('No se encontró el internamiento.');
      setLoading(false);
      return;
    }
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setItems(await getMedicationAdministrations(hospitalizationId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los medicamentos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hospitalizationId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function administer(item: MedicationAdministration) {
    if (!item.id || workingId) return;
    Alert.alert('Administrar medicamento', 'Confirma esta acción solo si el medicamento ya fue administrado al paciente.', [
      { style: 'cancel', text: 'Cancelar' },
      {
        text: 'Confirmar',
        onPress: async () => {
          try {
            setWorkingId(item.id!);
            await administerMedication(item.id!);
            await load(true);
          } catch (err) {
            Alert.alert('Medicamento', err instanceof Error ? err.message : 'No se pudo administrar el medicamento.');
          } finally {
            setWorkingId(null);
          }
        },
      },
    ]);
  }

  async function submitAction() {
    if (!selected?.id || !action || workingId) return;
    if (action === 'omit' && actionText.trim().length < 5) {
      Alert.alert('Medicamento', 'El motivo de omisión es obligatorio y debe tener al menos 5 caracteres.');
      return;
    }
    try {
      setWorkingId(selected.id);
      if (action === 'omit') await omitMedication(selected.id, { reason: actionText.trim() });
      if (action === 'delay') await delayMedication(selected.id, { notes: actionText.trim() || 'Retrasado desde app de enfermería.' });
      setSelected(null);
      setAction(null);
      setActionText('');
      await load(true);
    } catch (err) {
      Alert.alert('Medicamento', err instanceof Error ? err.message : 'No se pudo actualizar el medicamento.');
    } finally {
      setWorkingId(null);
    }
  }

  if (loading) return <LoadingState label="Cargando medicamentos..." />;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
        <AppHeader icon="pill" subtitle="Administración hospitalaria de medicamentos." title="Medicamentos" />
        <AppButton disabled={!hospitalizationId} label="Programar medicamento" onPress={() => navigation.navigate('NurseMedicationAdministrationForm', { hospitalizationId })} />
        {error ? <ErrorState message={error} onRetry={() => void load()} title="No se pudieron cargar medicamentos" /> : null}
        {!error && items.length === 0 ? <EmptyState description="No hay medicamentos programados." title="Sin medicamentos" /> : null}
        {items.map((item) => (
          <MedicationCard
            disabled={Boolean(workingId)}
            item={item}
            key={item.id ?? item.medication_name}
            loading={workingId === item.id}
            onAdminister={() => administer(item)}
            onDelay={() => { setSelected(item); setAction('delay'); setActionText(''); }}
            onOmit={() => { setSelected(item); setAction('omit'); setActionText(''); }}
          />
        ))}
        {selected && action ? (
          <AppCard style={styles.card}>
            <Text style={styles.title}>{action === 'omit' ? 'Motivo de omisión' : 'Nota de retraso'}</Text>
            <Text style={styles.description}>{selected.medication_name}</Text>
            <AppInput label={action === 'omit' ? 'Motivo obligatorio' : 'Nota'} onChangeText={setActionText} value={actionText} />
            <View style={styles.actions}>
              <AppButton disabled={Boolean(workingId)} label="Cancelar" onPress={() => { setSelected(null); setAction(null); setActionText(''); }} variant="secondary" />
              <AppButton disabled={Boolean(workingId)} label={action === 'omit' ? 'Omitir medicamento' : 'Retrasar medicamento'} loading={workingId === selected.id} onPress={submitAction} variant={action === 'omit' ? 'danger' : 'secondary'} />
            </View>
          </AppCard>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

export function MedicationCard({
  disabled,
  item,
  loading,
  onAdminister,
  onDelay,
  onOmit,
}: {
  disabled?: boolean;
  item: MedicationAdministration;
  loading?: boolean;
  onAdminister?: () => void;
  onDelay?: () => void;
  onOmit?: () => void;
}) {
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
      {!locked && onAdminister ? (
        <View style={styles.actions}>
          <AppButton disabled={disabled} label="Administrar" loading={loading} onPress={onAdminister} />
          <AppButton disabled={disabled} label="Retrasar" onPress={onDelay} variant="secondary" />
          <AppButton disabled={disabled} label="Omitir" onPress={onOmit} variant="danger" />
        </View>
      ) : null}
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
