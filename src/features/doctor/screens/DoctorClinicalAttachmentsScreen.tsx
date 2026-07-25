import { useNavigation, useRoute } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { DoctorHeader } from '@/features/doctor/components/DoctorHeader';
import { resolveRequiredConsultation } from '@/features/doctor/services/doctorConsultationContextService';
import { getConsultationDocuments, setDocumentPatientVisibility, shareClinicalDocument, type DoctorClinicalDocument, uploadConsultationDocument } from '@/features/doctor/services/doctorDocumentsService';
import { isConsultationFinalized } from '@/features/doctor/types/commonDoctor.types';

const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

export function DoctorClinicalAttachmentsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = useMemo(() => (route.params ?? {}) as { consultationId?: number; patientId?: number; visitId?: number }, [route.params]);
  const [consultationId, setConsultationId] = useState<number>();
  const [documents, setDocuments] = useState<DoctorClinicalDocument[]>([]);
  const [title, setTitle] = useState('');
  const [visible, setVisible] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const context = await resolveRequiredConsultation(params);
      setConsultationId(context.consultationId);
      setReadOnly(isConsultationFinalized(context.consultation?.status));
      if (context.consultationId) setDocuments(await getConsultationDocuments(context.consultationId));
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo cargar la información.'); }
    finally { setLoading(false); }
  }, [params]);

  useEffect(() => { load(); }, [load]);

  async function pickAndUpload() {
    if (!consultationId || busy || readOnly) return;
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false, type: allowedTypes });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.size && asset.size > 10 * 1024 * 1024) return Alert.alert('Documento clínico', 'El archivo excede el tamaño máximo de 10 MB.');
    setBusy(true);
    try {
      await uploadConsultationDocument(consultationId, asset, { title, visibleToPatient: visible });
      setTitle(''); setVisible(false);
      Alert.alert('Documento clínico', 'Documento adjuntado correctamente.');
      await load();
    } catch (err) { Alert.alert('Documento clínico', err instanceof Error ? err.message : 'El archivo seleccionado no está permitido.'); }
    finally { setBusy(false); }
  }

  async function toggle(item: DoctorClinicalDocument) {
    if (!item.id || busy) return;
    setBusy(true);
    try { await setDocumentPatientVisibility(item.id, !item.visible_to_patient); await load(); }
    catch (err) { Alert.alert('Documento clínico', err instanceof Error ? err.message : 'No se pudo cambiar la visibilidad.'); }
    finally { setBusy(false); }
  }

  if (loading) return <LoadingState label="Cargando documentos adjuntos..." />;
  if (error) return <ErrorState message={error} onRetry={load} title="No se pudo cargar la información" />;

  return <SafeAreaView style={styles.safeArea}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}><DoctorHeader title="Documentos clínicos" />{documents.length ? documents.map((item) => <AppCard key={item.id ?? item.title} style={styles.card}><Text style={styles.title}>{item.title ?? item.original_filename ?? 'Documento clínico'}</Text><Text style={styles.meta}>{item.original_filename ?? item.document_type ?? 'Adjunto'}</Text><Text style={styles.meta}>{item.visible_to_patient ? 'Visible para el paciente' : 'Uso interno'}</Text><View style={styles.actions}><AppButton label="Abrir" onPress={() => shareClinicalDocument(item).catch((err) => Alert.alert('Documento clínico', err instanceof Error ? err.message : 'No se pudo abrir.'))} style={styles.action} variant="secondary" />{!readOnly ? <AppButton disabled={busy} label={item.visible_to_patient ? 'Ocultar' : 'Publicar'} onPress={() => toggle(item)} style={styles.action} variant="secondary" /> : null}</View></AppCard>) : <EmptyState description="Adjunta resultados, imágenes o documentos relacionados con la consulta." title="No hay documentos adjuntos." />}{!readOnly ? <AppCard style={styles.card}><AppInput label="Nombre del documento" onChangeText={setTitle} value={title} /><AppButton disabled={busy} label={visible ? 'Visible para paciente: Sí' : 'Visible para paciente: No'} onPress={() => setVisible((value) => !value)} variant="secondary" /><AppButton disabled={busy} label="Seleccionar y adjuntar archivo" loading={busy} onPress={pickAndUpload} /></AppCard> : null}<AppButton label="Volver" onPress={() => navigation.goBack()} variant="secondary" /></ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

const styles = StyleSheet.create({
  action: { flex: 1 },
  actions: { flexDirection: 'row', gap: 8 },
  card: { gap: 10 },
  content: { gap: 14, padding: 22, paddingBottom: 128 },
  keyboard: { flex: 1 },
  meta: { color: colors.muted, fontSize: 12 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  title: { color: colors.ink, fontSize: 16, fontWeight: '900' },
});
