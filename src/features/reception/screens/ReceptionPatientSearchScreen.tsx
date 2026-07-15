import { useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppHeader } from '@/components/AppHeader';
import { AppInput } from '@/components/AppInput';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { ReceptionPatientCard } from '@/features/reception/components/ReceptionPatientCard';
import { searchPatients } from '@/features/reception/services/receptionPatientService';
import type { ReceptionPatient } from '@/features/reception/types/receptionPatient.types';

export function ReceptionPatientSearchScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const initialQuery = useMemo(() => String(route.params?.initialQuery ?? ''), [route.params?.initialQuery]);
  const [query, setQuery] = useState(initialQuery);
  const [patients, setPatients] = useState<ReceptionPatient[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const runSearch = useCallback(async (nextQuery = query) => {
    const cleanQuery = nextQuery.trim();
    if (cleanQuery.length < 2) {
      setSearched(false);
      setPatients([]);
      setError('Escribe al menos 2 caracteres para buscar.');
      return;
    }
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      setPatients(await searchPatients(cleanQuery));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo buscar pacientes.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    if (initialQuery.trim().length >= 2) {
      setQuery(initialQuery);
      void runSearch(initialQuery);
    }
  }, [initialQuery, runSearch]);

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AppHeader icon="account-search-outline" subtitle="Busca por nombre, identidad, teléfono o código." title="Buscar paciente" />
        <AppInput autoCapitalize="words" label="Paciente" onChangeText={setQuery} onSubmitEditing={() => void runSearch()} placeholder="Ej. Juan Perez" value={query} />
        <AppButton disabled={query.trim().length < 2} label="Buscar" loading={loading} onPress={() => void runSearch()} />
        <AppButton label="Crear paciente nuevo" onPress={() => navigation.navigate('ReceptionPatientCreate')} variant="secondary" />
        {loading ? <LoadingState label="Buscando pacientes..." /> : null}
        {error ? <ErrorState message={error} onRetry={query.trim().length >= 2 ? () => void runSearch() : undefined} title={query.trim().length < 2 ? 'Búsqueda incompleta' : 'No se pudo buscar'} /> : null}
        {!loading && searched && !error && patients.length === 0 ? (
          <EmptyState
            actionLabel="Crear paciente"
            description="Revisa si escribiste correctamente la identidad o teléfono. Si es un paciente nuevo, puedes registrarlo ahora."
            icon="account-plus-outline"
            onAction={() => navigation.navigate('ReceptionPatientCreate')}
            title="No encontramos coincidencias"
            tone="warning"
          />
        ) : null}
        {patients.map((patient) => (
          <ReceptionPatientCard
            key={patient.id}
            onCreateAdmission={() => navigation.navigate('ReceptionCreateAdmission', { patient, patientId: patient.id })}
            onPress={() => navigation.navigate('ReceptionPatientDetail', { patientId: patient.id })}
            patient={patient}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 18, paddingBottom: 120 },
  safe: { backgroundColor: colors.background, flex: 1 },
});
