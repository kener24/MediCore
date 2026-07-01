import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
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
  const [query, setQuery] = useState('');
  const [patients, setPatients] = useState<ReceptionPatient[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  async function runSearch() {
    if (query.trim().length < 2) {
      setSearched(false);
      setPatients([]);
      setError('Escribe al menos 2 caracteres para buscar.');
      return;
    }
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      setPatients(await searchPatients(query));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo buscar pacientes.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AppHeader icon="account-search-outline" subtitle="Busca por nombre, identidad, teléfono o código." title="Buscar paciente" />
        <AppInput autoCapitalize="words" label="Paciente" onChangeText={setQuery} onSubmitEditing={runSearch} placeholder="Ej. Juan Pérez" value={query} />
        <AppButton disabled={query.trim().length < 2} label="Buscar" loading={loading} onPress={runSearch} />
        <AppButton label="Crear paciente nuevo" onPress={() => navigation.navigate('ReceptionPatientCreate')} variant="secondary" />
        {loading ? <LoadingState label="Buscando pacientes..." /> : null}
        {error ? <ErrorState message={error} onRetry={query.trim().length >= 2 ? runSearch : undefined} title={query.trim().length < 2 ? 'Búsqueda incompleta' : 'No se pudo buscar'} /> : null}
        {!loading && searched && !error && patients.length === 0 ? <EmptyState description="Puedes crear un paciente mínimo para continuar." title="No se encontraron pacientes." /> : null}
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
