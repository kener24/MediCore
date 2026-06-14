import { useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { getPatientDocument, openPatientDocumentUrl } from '@/features/patient/services/patientDocumentsService';
import type { PatientDocument } from '@/features/patient/types/patientDocuments.types';
import { formatDate } from '@/features/patient/utils/formatters';

export function PatientDocumentDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { id } = route.params as { id: number };
  const [document, setDocument] = useState<PatientDocument | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setDocument(await getPatientDocument(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function open(mode: 'preview' | 'download') {
    if (!document) return;
    try {
      await openPatientDocumentUrl(document, mode);
    } catch {
      Alert.alert('Documento', 'No se pudo abrir el documento.');
    }
  }

  if (loading) return <LoadingState label="Cargando documento..." />;
  if (error || !document) return <ErrorState message={error || 'No hay informacion disponible.'} onRetry={load} />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppButton label="Volver" onPress={() => navigation.goBack()} variant="secondary" />
        <AppCard>
          <Text style={styles.title}>{document.title || document.original_filename || 'Documento clinico'}</Text>
          <Text style={styles.meta}>{document.category_name || document.category || 'Documento'}</Text>
          <Text style={styles.meta}>Fecha: {formatDate(document.creado_en)}</Text>
          <Text style={styles.meta}>Tipo: {document.file_type || document.mime_type || document.file_extension || 'No indicado'}</Text>
          <Text style={styles.meta}>Subido por: {document.uploaded_by_name || 'No indicado'}</Text>
          {document.description ? <Text style={styles.text}>{document.description}</Text> : null}
        </AppCard>
        <AppButton label="Ver preview" onPress={() => open('preview')} />
        <AppButton label="Descargar" onPress={() => open('download')} variant="secondary" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 22, paddingBottom: 34 },
  meta: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 6 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  text: { color: colors.ink, fontSize: 14, lineHeight: 21, marginTop: 12 },
  title: { color: colors.ink, fontSize: 22, fontWeight: '900' },
});
