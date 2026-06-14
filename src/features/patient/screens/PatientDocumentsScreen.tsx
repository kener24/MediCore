import { useFocusEffect, useNavigation, type NavigationProp, type ParamListBase } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  const [filter, setFilter] = useState('all');
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

  const documentTypes = useMemo(() => {
    const types = documents
      .map((item) => String(item.category_name || item.file_type || item.file_extension || 'Documento'))
      .filter(Boolean);
    return ['all', ...Array.from(new Set(types))];
  }, [documents]);

  const visibleDocuments = useMemo(
    () =>
      documents.filter((item) => {
        if (filter === 'all') return true;
        const type = String(item.category_name || item.file_type || item.file_extension || 'Documento');
        return type === filter;
      }),
    [documents, filter],
  );

  if (loading) return <LoadingState label="Cargando documentos..." />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => load(true)} refreshing={refreshing} />}
        showsVerticalScrollIndicator={false}>
        <PatientHeader subtitle="Solo verás documentos autorizados por tu clínica." title="Mis documentos" />
        {documentTypes.length > 2 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterRow}>
              {documentTypes.map((item) => {
                const active = item === filter;
                return (
                  <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filter, active && styles.activeFilter]}>
                    <Text style={[styles.filterText, active && styles.activeFilterText]}>{item === 'all' ? 'Todos' : item}</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        ) : null}
        {error ? (
          <ErrorState message={error} onRetry={() => load()} title="No se pudieron cargar documentos" />
        ) : visibleDocuments.length ? (
          visibleDocuments.map((document) => (
            <DocumentCard
              document={document}
              key={document.id}
              onPress={() => navigation.navigate('PatientDocumentDetail', { id: document.id })}
            />
          ))
        ) : (
          <EmptyState description="No tienes documentos disponibles." title="Sin documentos" />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  activeFilter: { backgroundColor: colors.primary },
  activeFilterText: { color: colors.white },
  content: { gap: 12, padding: 22, paddingBottom: 34 },
  filter: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterText: { color: colors.muted, fontSize: 13, fontWeight: '900' },
  safeArea: { backgroundColor: colors.background, flex: 1 },
});
