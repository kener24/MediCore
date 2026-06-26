import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';

import { ErrorState } from '@/components/ErrorState';
import { KeyboardAwareScreen } from '@/components/KeyboardAwareScreen';
import { LoadingState } from '@/components/LoadingState';
import { EditableProfileForm } from '@/features/patient/components/EditableProfileForm';
import { PatientHeader } from '@/features/patient/components/PatientHeader';
import { getPatientProfile, updatePatientProfile } from '@/features/patient/services/patientProfileService';
import type {
  PatientProfile,
  PatientProfileUpdatePayload,
} from '@/features/patient/types/patientProfile.types';

export function EditPatientProfileScreen() {
  const navigation = useNavigation<any>();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setProfile(await getPatientProfile());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la información.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function save(payload: PatientProfileUpdatePayload) {
    setSubmitting(true);
    try {
      await updatePatientProfile(payload);
      Alert.alert('Perfil', 'Perfil actualizado correctamente.');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Perfil', err instanceof Error ? err.message : 'No se pudo actualizar tu perfil.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState label="Preparando formulario..." />;

  return (
    <KeyboardAwareScreen contentContainerStyle={styles.content}>
        <PatientHeader subtitle="Solo puedes modificar datos de contacto permitidos." title="Editar perfil" />
        {error ? (
          <ErrorState message={error} onRetry={load} title="No se pudo cargar el perfil" />
        ) : profile ? (
          <EditableProfileForm
            onCancel={() => navigation.goBack()}
            onSubmit={save}
            profile={profile}
            submitting={submitting}
          />
        ) : null}
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 22, paddingBottom: 34 },
});
