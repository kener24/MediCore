import { useFocusEffect, useRoute } from '@react-navigation/native';
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
import { isDeviceOnline } from '@/core/network/connectivity';
import { administerMedication, delayMedication, getMedicationAdministrations, omitMedication, refuseMedication, unavailableMedication } from '@/features/nurse/hospitalization/services/nurseHospitalizationService';
import type { MedicationAdministration } from '@/features/nurse/hospitalization/types/nurseHospitalization.types';

type MedicationAction = 'administer' | 'omit' | 'delay' | 'refuse' | 'unavailable';

export function NurseMedicationAdministrationsScreen() {
  const route = useRoute<any>();
  const hospitalizationId = toPositiveId(route.params?.hospitalizationId);
  const [items, setItems] = useState<MedicationAdministration[]>([]);
  const [selected, setSelected] = useState<MedicationAdministration | null>(null);
  const [action, setAction] = useState<MedicationAction | null>(null);
  const [actionText, setActionText] = useState('');
  const [actualDose, setActualDose] = useState('');
  const [inventoryQuantity, setInventoryQuantity] = useState('');
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

  async function submitAction() {
    if (!selected?.id || !action || workingId) return;
    if (['omit', 'delay', 'refuse', 'unavailable'].includes(action) && actionText.trim().length < 5) {
      Alert.alert('Medicamento', 'El motivo es obligatorio y debe tener al menos 5 caracteres.');
      return;
    }
    if (action === 'administer' && (!actualDose || Number(actualDose) <= 0 || !inventoryQuantity || Number(inventoryQuantity) <= 0)) return Alert.alert('Medicamento', 'Confirma la dosis y la cantidad de inventario utilizada.');
    try {
      setWorkingId(selected.id);
      if (action === 'administer') {
        if (!(await isDeviceOnline())) throw new Error('No tienes conexión. La administración de medicamentos requiere conexión al servidor.');
        await administerMedication(selected.id, {
          administered_dose: actualDose,
          dose_unit: selected.dose_unit || 'mg',
          route: selected.route || 'other',
          inventory_quantity: inventoryQuantity,
          notes: actionText.trim(),
          idempotency_key: `med-${selected.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        });
      }
      if (action === 'omit') await omitMedication(selected.id, { reason: actionText.trim() });
      if (action === 'delay') await delayMedication(selected.id, { notes: actionText.trim() });
      if (action === 'refuse') await refuseMedication(selected.id, { reason: actionText.trim() });
      if (action === 'unavailable') await unavailableMedication(selected.id, { reason: actionText.trim() });
      setSelected(null);
      setAction(null);
      setActionText('');
      setActualDose('');
      setInventoryQuantity('');
      await load(true);
    } catch (err) {
      Alert.alert('Medicamento', err instanceof Error ? err.message : 'No se pudo actualizar el medicamento.');
    } finally {
      setWorkingId(null);
    }
  }

  if (loading) return <LoadingState label="Cargando medicamentos..." />;

  const administeredHistory = items.filter((item) => item.status === 'administered' && item.administered_time).sort((a, b) => String(b.administered_time).localeCompare(String(a.administered_time)));
  const nextScheduled = selected ? items.filter((item) => item.id !== selected.id && ['pending', 'scheduled', 'due', 'delayed'].includes(String(item.status)) && item.scheduled_time).sort((a, b) => String(a.scheduled_time).localeCompare(String(b.scheduled_time)))[0] : null;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
        <AppHeader icon="pill" subtitle="Administración hospitalaria de medicamentos." title="Medicamentos" />
        <Text style={styles.description}>Las dosis son programadas desde indicaciones médicas activas. Confirma paciente, dosis, vía y cantidad utilizada antes de administrar.</Text>
        {error ? <ErrorState message={error} onRetry={() => void load()} title="No se pudieron cargar medicamentos" /> : null}
        {!error && items.length === 0 ? <EmptyState description="No hay medicamentos programados." title="Sin medicamentos" /> : null}
        {items.map((item) => (
          <MedicationCard
            disabled={Boolean(workingId)}
            item={item}
            key={item.id ?? item.medication_name}
            loading={workingId === item.id}
            onAdminister={() => { setSelected(item); setAction('administer'); setActionText(''); setActualDose(item.ordered_dose || item.dosage?.split(' ')[0] || ''); setInventoryQuantity(item.inventory_quantity || '1'); }}
            onDelay={() => { setSelected(item); setAction('delay'); setActionText(''); }}
            onOmit={() => { setSelected(item); setAction('omit'); setActionText(''); }}
            onRefuse={() => { setSelected(item); setAction('refuse'); setActionText(''); }}
            onUnavailable={() => { setSelected(item); setAction('unavailable'); setActionText(''); }}
          />
        ))}
        {selected && action ? (
          <AppCard style={styles.card}>
            <Text style={styles.title}>{action === 'administer' ? 'Verificación previa' : action === 'omit' ? 'Motivo de omisión' : action === 'refuse' ? 'Rechazo del paciente' : action === 'unavailable' ? 'Medicamento no disponible' : 'Nota de retraso'}</Text>
            <Text style={styles.description}>{selected.patient_name || 'Paciente'} · {selected.medication_name} · {selected.dosage} · {routeLabel(selected.route)}</Text>
            <Text style={styles.description}>Identidad: {selected.patient_identity || 'No registrada'} · Ubicación: {[selected.room_name, selected.bed_number ? `cama ${selected.bed_number}` : ''].filter(Boolean).join(' · ') || 'Sin cama asignada'}</Text>
            <Text style={styles.description}>Programado: {formatDateTime(selected.scheduled_time, 'Sin hora')} · Stock: {selected.stock_available ?? 'No disponible'}</Text>
            <Text style={selected.patient_allergies || selected.allergy_warning ? styles.alert : styles.description}>Alergias: {selected.patient_allergies || 'Ninguna registrada'}{selected.allergy_warning ? ` · Alerta: ${selected.allergy_warning}` : ''}</Text>
            {selected.instruction_notes ? <Text style={styles.description}>Indicaciones: {selected.instruction_notes}</Text> : null}
            <Text style={styles.description}>Última administración: {formatDateTime(administeredHistory[0]?.administered_time, 'Sin registro')} · Próxima: {formatDateTime(nextScheduled?.scheduled_time, 'Sin programación')}</Text>
            {action === 'administer' ? <><AppInput keyboardType="decimal-pad" label={`Dosis administrada (${selected.dose_unit || 'unidad'})`} onChangeText={setActualDose} value={actualDose} /><AppInput keyboardType="decimal-pad" label="Cantidad de inventario utilizada" onChangeText={setInventoryQuantity} value={inventoryQuantity} /></> : null}
            <AppInput label={action === 'administer' || action === 'delay' ? 'Observaciones' : 'Motivo obligatorio'} multiline onChangeText={setActionText} value={actionText} />
            <View style={styles.actions}>
              <AppButton disabled={Boolean(workingId)} label="Cancelar" onPress={() => { setSelected(null); setAction(null); setActionText(''); setActualDose(''); setInventoryQuantity(''); }} variant="secondary" />
              <AppButton disabled={Boolean(workingId)} label={action === 'administer' ? 'Confirmar administración' : action === 'omit' ? 'Omitir medicamento' : action === 'refuse' ? 'Registrar rechazo' : action === 'unavailable' ? 'Registrar sin existencia' : 'Retrasar medicamento'} loading={workingId === selected.id} onPress={submitAction} variant={['omit', 'refuse', 'unavailable'].includes(action) ? 'danger' : action === 'administer' ? 'primary' : 'secondary'} />
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
  onRefuse,
  onUnavailable,
  onOpen,
}: {
  disabled?: boolean;
  item: MedicationAdministration;
  loading?: boolean;
  onAdminister?: () => void;
  onDelay?: () => void;
  onOmit?: () => void;
  onRefuse?: () => void;
  onUnavailable?: () => void;
  onOpen?: () => void;
}) {
  const locked = ['administered', 'omitted', 'refused', 'unavailable', 'cancelled', 'reversed'].includes(String(item.status));
  return (
    <AppCard style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.title}>{item.medication_name || 'Medicamento'}</Text>
        <StatusBadge status={item.status} />
      </View>
      <Text style={styles.description}>Dosis: {item.dosage || '-'} · Vía: {routeLabel(item.route)}</Text>
      {item.patient_name ? <Text style={styles.description}>Paciente: {item.patient_name} · Cama: {item.bed_number || 'Sin asignar'}</Text> : null}
      <Text style={styles.description}>Programado: {formatDateTime(item.scheduled_time, 'Sin hora programada')}</Text>
      {item.patient_allergies || item.allergy_warning ? <Text style={styles.alert}>Alergias: {item.patient_allergies || 'No registradas'}{item.allergy_warning ? ` · ${item.allergy_warning}` : ''}</Text> : null}
      {item.administered_by_name ? <Text style={styles.description}>Enfermera: {item.administered_by_name}</Text> : null}
      {item.notes ? <Text style={styles.description}>{item.notes}</Text> : null}
      {item.omission_reason ? <Text style={styles.description}>Omisión: {item.omission_reason}</Text> : null}
      {item.refusal_reason ? <Text style={styles.description}>Rechazo: {item.refusal_reason}</Text> : null}
      {item.unavailable_reason ? <Text style={styles.description}>Sin existencia: {item.unavailable_reason}</Text> : null}
      {!locked && onAdminister ? (
        <View style={styles.actions}>
          <AppButton disabled={disabled} label="Administrar" loading={loading} onPress={onAdminister} />
          <AppButton disabled={disabled} label="Retrasar" onPress={onDelay} variant="secondary" />
          <AppButton disabled={disabled} label="Omitir" onPress={onOmit} variant="danger" />
          <AppButton disabled={disabled} label="Rechazo" onPress={onRefuse} variant="secondary" />
          <AppButton disabled={disabled} label="Sin existencia" onPress={onUnavailable} variant="secondary" />
        </View>
      ) : null}
      {onOpen ? <AppButton label="Abrir registro" onPress={onOpen} variant="secondary" /> : null}
    </AppCard>
  );
}

function routeLabel(route?: string) {
  const labels: Record<string, string> = { im: 'IM', inhaled: 'Inhalada', iv: 'IV', oral: 'Oral', other: 'Otra', sc: 'SC', topical: 'Tópica' };
  return labels[String(route ?? '')] ?? 'No registrada';
}

const styles = StyleSheet.create({
  actions: { gap: 8 },
  alert: { color: colors.danger, fontSize: 13, fontWeight: '800', lineHeight: 19 },
  card: { gap: 10 },
  content: { gap: 14, padding: 18, paddingBottom: 130 },
  description: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  rowBetween: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  safe: { backgroundColor: colors.background, flex: 1 },
  title: { color: colors.ink, fontSize: 16, fontWeight: '900' },
});
