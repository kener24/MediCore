import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { PatientHeader } from '@/features/patient/components/PatientHeader';
import { ProfileInfoCard } from '@/features/patient/components/ProfileInfoCard';
import { getPatientProfile } from '@/features/patient/services/patientProfileService';
import type { PatientProfile } from '@/features/patient/types/patientProfile.types';

function getFullName(profile: PatientProfile) {
  return profile.full_name ?? profile.nombre_completo ?? [profile.first_name, profile.last_name].filter(Boolean).join(' ');
}

function getClinicName(profile: PatientProfile) {
  return (
    profile.clinic_name ??
    profile.clinica_nombre ??
    profile.clinic_nombre ??
    profile.clinic?.name ??
    profile.clinic?.nombre ??
    profile.clinica?.name ??
    profile.clinica?.nombre
  );
}

export function PatientProfileScreen() {
  const navigation = useNavigation<any>();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setProfile(await getPatientProfile());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la información.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <LoadingState label="Cargando perfil..." />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => load(true)} refreshing={refreshing} />}
        showsVerticalScrollIndicator={false}>
        <PatientHeader
          name={profile ? getFullName(profile) : undefined}
          subtitle="Datos personales del portal paciente."
          title="Perfil"
        />
        {error ? (
          <ErrorState message={error} onRetry={() => load()} title="No se pudo cargar el perfil" />
        ) : profile ? (
          <>
            <ProfileInfoCard
              items={[
                { label: 'Nombre legal', value: getFullName(profile) },
                { label: 'Identidad', value: profile.identity_number ?? profile.identidad },
                { label: 'Código paciente', value: profile.patient_code ?? profile.codigo_paciente },
                { label: 'Fecha nacimiento', value: profile.birth_date ?? profile.fecha_nacimiento },
                { label: 'Género', value: profile.gender ?? profile.genero },
                { label: 'Clínica', value: getClinicName(profile) },
              ]}
              title="Información no editable"
            />
            <ProfileInfoCard
              items={[
                { label: 'Teléfono', value: profile.phone ?? profile.telefono },
                { label: 'Correo', value: profile.email ?? profile.correo },
                { label: 'Dirección', value: profile.address ?? profile.direccion },
                { label: 'Ciudad', value: profile.city ?? profile.ciudad },
                { label: 'Departamento', value: profile.department ?? profile.departamento },
              ]}
              title="Contacto"
            />
            <ProfileInfoCard
              items={[
                { label: 'Nombre', value: profile.emergency_contact_name ?? profile.contacto_emergencia_nombre },
                { label: 'Teléfono', value: profile.emergency_contact_phone ?? profile.contacto_emergencia_telefono },
                {
                  label: 'Parentesco',
                  value: profile.emergency_contact_relationship ?? profile.contacto_emergencia_parentesco,
                },
              ]}
              title="Contacto de emergencia"
            />
            <ProfileInfoCard
              items={[
                { label: 'Alergias', value: profile.alergias || 'No hay alergias registradas.' },
                { label: 'Antecedentes crónicos', value: profile.enfermedades_cronicas || 'No hay antecedentes registrados.' },
              ]}
              title="Información clínica autorizada"
            />
            <Text style={styles.clinicalNotice}>La ausencia de registros no garantiza que no existan alergias o antecedentes. Comunícalos al personal médico.</Text>
            <AppButton label="Editar perfil" onPress={() => navigation.navigate('EditPatientProfile')} />
            <AppButton
              label="Configuración"
              onPress={() => navigation.navigate('PatientSettings')}
              variant="secondary"
            />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  clinicalNotice: { color: colors.warning, fontSize: 13, fontWeight: '700', lineHeight: 19 },
  content: { gap: 14, padding: 22, paddingBottom: 34 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
});
