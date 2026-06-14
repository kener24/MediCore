import { useFocusEffect, useNavigation, type NavigationProp, type ParamListBase } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { DocumentCard } from '@/features/patient/components/DocumentCard';
import { PatientHeader } from '@/features/patient/components/PatientHeader';
import { getPatientDocuments } from '@/features/patient/services/patientDocumentsService';
import type { PatientDocument } from '@/features/patient/types/patientDocuments.types';

export function PatientDocumentsScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setDocuments(await getPatientDocuments());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <LoadingState label="Cargando documentos..." />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => load(true)} refreshing={refreshing} />}
        showsVerticalScrollIndicator={false}>
        <PatientHeader subtitle="Solo veras documentos autorizados por tu clinica." title="Documentos clinicos" />
        {error ? (
          <ErrorState message={error} onRetry={() => load()} title="No se pudieron cargar documentos" />
        ) : documents.length ? (
          documents.map((document) => (
            <DocumentCard
              document={document}
              key={document.id}
              onPress={() => navigation.navigate('PatientDocumentDetail', { id: document.id })}
            />
          ))
        ) : (
          <EmptyState description="No hay documentos clinicos visibles." title="Sin documentos" />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, padding: 22, paddingBottom: 34 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
});
