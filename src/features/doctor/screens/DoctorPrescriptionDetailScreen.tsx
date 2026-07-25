import { useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { formatDateTime } from '@/core/utils/dateUtils';
import { DoctorHeader } from '@/features/doctor/components/DoctorHeader';
import { cancelDoctorPrescription, getPrescriptionDetail, issueDoctorPrescription, sharePrescriptionPdf } from '@/features/doctor/services/doctorPrescriptionService';
import type { DoctorPrescription, PrescriptionMedicationPayload } from '@/features/doctor/types/doctorPrescription.types';

export function DoctorPrescriptionDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = useMemo(() => (route.params ?? {}) as { prescription?: DoctorPrescription; prescriptionId?: number }, [route.params]);
  const [prescription, setPrescription] = useState<DoctorPrescription | null>(params.prescription ?? null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [allergyWarning, setAllergyWarning] = useState('');
  const [allergyReason, setAllergyReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const prescriptionId = params.prescriptionId ?? params.prescription?.id;

  const load = useCallback(async () => {
    if (!prescriptionId) { setError('No se encontró la receta médica.'); setLoading(false); return; }
    setLoading(true); setError('');
    try { setPrescription(await getPrescriptionDetail(prescriptionId)); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo cargar la receta médica.'); }
    finally { setLoading(false); }
  }, [prescriptionId]);

  useEffect(() => { load(); }, [load]);

  async function issue(confirmAllergies = false) {
    if (!prescriptionId || busy) return;
    if (confirmAllergies && allergyReason.trim().length < 8) return Alert.alert('Receta médica', 'Escribe una justificación clínica de al menos 8 caracteres.');
    setBusy(true);
    try {
      const updated = await issueDoctorPrescription(prescriptionId, confirmAllergies ? { confirm_allergies: true, allergy_override_reason: allergyReason.trim() } : undefined);
      setPrescription(updated); setAllergyWarning('');
      Alert.alert('Receta médica', 'Receta emitida correctamente.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo emitir la receta.';
      if (message.toLowerCase().includes('alergia')) setAllergyWarning(message);
      else Alert.alert('Receta médica', message);
    } finally { setBusy(false); }
  }

  async function cancel() {
    if (!prescriptionId || busy) return;
    if (cancelReason.trim().length < 5) return Alert.alert('Receta médica', 'Escribe un motivo de al menos 5 caracteres.');
    setBusy(true);
    try { setPrescription(await cancelDoctorPrescription(prescriptionId, cancelReason.trim())); Alert.alert('Receta médica', 'Receta anulada correctamente.'); }
    catch (err) { Alert.alert('Receta médica', err instanceof Error ? err.message : 'No se pudo anular la receta.'); }
    finally { setBusy(false); }
  }

  if (loading) return <LoadingState label="Cargando receta médica..." />;
  if (error) return <ErrorState message={error} onRetry={load} title="No se pudo cargar la receta" />;
  const medications = normalizeMedications(prescription);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <DoctorHeader title="Detalle de receta" />
        <AppCard style={styles.card}>
          <Text style={styles.title}>{prescription?.prescription_number ?? `Receta #${prescription?.id ?? 'sin número'}`}</Text>
          <Info label="Estado" value={prescription?.status ?? 'Registrada'} />
          <Info label="Médico" value={prescription?.doctor_name} />
          <Info label="Fecha" value={formatDateTime(prescription?.issued_at ?? prescription?.created_at)} />
          <Info label="Instrucciones generales" value={prescription?.general_instructions} />
        </AppCard>
        {medications.length ? medications.map((item, index) => <AppCard key={`${item.medication_name}-${index}`} style={styles.card}><Text style={styles.itemTitle}>{item.medication_name || `Medicamento ${index + 1}`}</Text><Info label="Presentación" value={item.presentation} /><Info label="Dosis" value={item.dosage} /><Info label="Frecuencia" value={item.frequency} /><Info label="Duración" value={item.duration} /><Info label="Vía" value={item.route} /><Info label="Cantidad" value={item.quantity ? String(item.quantity) : undefined} /><Info label="Indicaciones" value={item.instructions} /></AppCard>) : <EmptyState description="La receta no tiene medicamentos registrados." title="Sin medicamentos" />}
        {allergyWarning ? <AppCard style={styles.warningCard}><Text style={styles.warningTitle}>Alerta de alergia</Text><Text style={styles.warningText}>{allergyWarning}</Text><AppInput label="Justificación clínica" multiline onChangeText={setAllergyReason} value={allergyReason} /><AppButton disabled={busy} label="Confirmar alerta y emitir" loading={busy} onPress={() => issue(true)} /></AppCard> : null}
        {prescription?.status === 'borrador' ? <AppCard style={styles.card}><AppButton disabled={busy} label="Emitir receta" loading={busy} onPress={() => issue(false)} /><AppInput label="Motivo para anular" multiline onChangeText={setCancelReason} value={cancelReason} /><AppButton disabled={busy} label="Anular receta" onPress={cancel} variant="danger" /></AppCard> : null}
        {prescription?.status === 'emitida' && prescriptionId ? <AppButton disabled={busy} label="Abrir o compartir PDF" onPress={() => sharePrescriptionPdf(prescriptionId, prescription.prescription_number).catch((err) => Alert.alert('Receta médica', err instanceof Error ? err.message : 'No se pudo abrir el PDF.'))} /> : null}
        <AppButton label="Volver" onPress={() => navigation.goBack()} variant="secondary" />
      </ScrollView>
    </SafeAreaView>
  );
}

function normalizeMedications(prescription?: DoctorPrescription | null) {
  if (Array.isArray(prescription?.items)) return prescription.items;
  if (Array.isArray(prescription?.medications) && prescription.medications.every((item) => typeof item === 'object')) return prescription.medications as PrescriptionMedicationPayload[];
  return [];
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return <View style={styles.info}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value || 'No indicado'}</Text></View>;
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  content: { gap: 14, padding: 22, paddingBottom: 128 },
  info: { gap: 3 },
  itemTitle: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  label: { color: colors.muted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  title: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  value: { color: colors.ink, fontSize: 14, lineHeight: 20 },
  warningCard: { backgroundColor: '#FFF7ED', borderColor: '#FDBA74', gap: 10 },
  warningText: { color: '#9A3412', fontSize: 14, lineHeight: 20 },
  warningTitle: { color: '#9A3412', fontSize: 16, fontWeight: '900' },
});
