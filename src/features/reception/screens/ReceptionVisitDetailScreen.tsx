import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { VisitStatusBadge } from '@/features/reception/components/VisitStatusBadge';
import { cancelAdmission, generateInvoiceFromReceptionVisit, getVisitDetail, sendToDoctor, sendToTriage } from '@/features/reception/services/receptionAdmissionService';
import { visitDoctorName, visitPatientName } from '@/features/reception/services/receptionMappers';
import type { ReceptionVisit } from '@/features/reception/types/receptionAdmission.types';

export function ReceptionVisitDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const visitId = Number(route.params?.visitId);
  const [visit, setVisit] = useState<ReceptionVisit | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const load = useCallback(async () => {
    if (!visitId) {
      setVisit(null);
      setError('No se encontro la visita.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setVisit(await getVisitDetail(visitId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la visita.');
    } finally {
      setLoading(false);
    }
  }, [visitId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function run(action: 'triage' | 'doctor' | 'invoice') {
    if (!visit?.id) return;
    try {
      setBusy(true);
      if (action === 'triage') {
        setVisit(await sendToTriage(visit.id));
        Alert.alert('Visita', 'Paciente enviado a triaje.');
        return;
      }
      if (action === 'doctor') {
        setVisit(await sendToDoctor(visit.id));
        Alert.alert('Visita', 'Paciente enviado al medico.');
        return;
      }
      if (action === 'invoice') {
        const invoice = await generateInvoiceFromReceptionVisit(visit.id);
        await load();
        Alert.alert('Factura', 'Factura generada correctamente.', [
          { text: 'Ver factura', onPress: () => invoice.id ? navigation.navigate('ReceptionCashierTab', { screen: 'CashierInvoiceDetail', params: { invoiceId: invoice.id } }) : undefined },
        ]);
      }
    } catch (err) {
      Alert.alert('Visita', err instanceof Error ? err.message : 'Esta accion no esta disponible por el momento.');
    } finally {
      setBusy(false);
    }
  }

  async function confirmCancel() {
    const reason = cancelReason.trim();
    if (reason.length < 5) return Alert.alert('Cancelar admision', 'Indica un motivo claro de cancelacion.');
    if (!visit?.id) return;
    try {
      setBusy(true);
      setVisit(await cancelAdmission(visit.id, reason));
      setCancelOpen(false);
      setCancelReason('');
      Alert.alert('Visita', 'Admision cancelada correctamente.');
    } catch (err) {
      Alert.alert('Visita', err instanceof Error ? err.message : 'No se pudo cancelar la admision.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingState label="Cargando visita..." />;
  const status = String(visit?.status ?? '');
  const closed = ['cancelled', 'completed', 'paid'].includes(status);
  const canSendTriage = !closed && !['waiting_triage', 'in_triage', 'waiting_billing', 'waiting_payment'].includes(status);
  const canSendDoctor = !closed && !['waiting_doctor', 'in_consultation', 'waiting_billing', 'waiting_payment'].includes(status);
  const canInvoice = status === 'waiting_billing' && !visit?.invoice;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeader icon="clipboard-text-outline" subtitle="Informacion operativa de recepcion." title="Detalle de visita" />
        {error ? <ErrorState message={error} onRetry={() => void load()} title="No se pudo cargar" /> : null}
        {!error && !visit ? <EmptyState title="Visita no disponible" /> : null}
        {visit ? (
          <>
            <AppCard style={styles.card}>
              <VisitStatusBadge status={visit.status} />
              <Text style={styles.title}>{visitPatientName(visit)}</Text>
              <Info label="Motivo" value={visit.reason || 'No registrado'} />
              <Info label="Tipo" value={visit.visit_type || 'No registrado'} />
              <Info label="Prioridad" value={visit.priority || 'normal'} />
              <Info label="Medico" value={visitDoctorName(visit)} />
              <Info label="Llegada" value={visit.arrival_time || visit.creado_en || 'Sin hora'} />
              <Info label="Cita relacionada" value={String(visit.appointment ?? visit.appointment_id ?? 'Sin cita')} />
              <Info label="Factura" value={visit.invoice ? `#${visit.invoice}` : 'Sin factura'} />
            </AppCard>
            {!closed ? (
              <View style={styles.actions}>
                {canSendTriage ? <AppButton disabled={busy} label="Enviar a triaje" onPress={() => void run('triage')} /> : null}
                {canSendDoctor ? <AppButton disabled={busy} label="Enviar a medico" onPress={() => void run('doctor')} variant="secondary" /> : null}
                {canInvoice ? <AppButton disabled={busy} label="Generar factura" onPress={() => void run('invoice')} /> : null}
                <AppButton disabled={busy} label="Cancelar admision" onPress={() => setCancelOpen(true)} variant="danger" />
              </View>
            ) : null}
            <AppButton label="Volver" onPress={() => navigation.goBack()} variant="secondary" />
          </>
        ) : null}
      </ScrollView>
      <Modal animationType="fade" transparent visible={cancelOpen} onRequestClose={() => setCancelOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cancelar admision</Text>
            <Text style={styles.modalMeta}>Escribe el motivo. Esta accion quedara auditada.</Text>
            <TextInput
              multiline
              onChangeText={setCancelReason}
              placeholder="Ej. Paciente decide retirarse antes de ser atendido"
              placeholderTextColor="#98a2b3"
              style={styles.reasonInput}
              value={cancelReason}
            />
            <View style={styles.modalActions}>
              <AppButton disabled={busy} label="Cerrar" onPress={() => setCancelOpen(false)} variant="secondary" />
              <AppButton disabled={busy} label="Confirmar" loading={busy} onPress={confirmCancel} variant="danger" />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <Text style={styles.meta}>{label}: {value}</Text>;
}

const styles = StyleSheet.create({
  actions: { gap: 10 },
  card: { gap: 7 },
  content: { gap: 14, padding: 18, paddingBottom: 120 },
  meta: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  modalActions: { gap: 10 },
  modalBackdrop: { alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.45)', flex: 1, justifyContent: 'center', padding: 18 },
  modalCard: { backgroundColor: colors.white, borderRadius: 20, gap: 12, padding: 18, width: '100%' },
  modalMeta: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  modalTitle: { color: colors.ink, fontSize: 20, fontWeight: '900' },
  reasonInput: { backgroundColor: colors.surfaceMuted, borderColor: colors.border, borderRadius: 14, borderWidth: 1, color: colors.ink, minHeight: 110, padding: 12, textAlignVertical: 'top' },
  safe: { backgroundColor: colors.background, flex: 1 },
  title: { color: colors.ink, fontSize: 20, fontWeight: '900' },
});
