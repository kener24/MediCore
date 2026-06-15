import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { useAuth } from '@/features/auth/context/AuthContext';
import { DoctorHeader } from '@/features/doctor/components/DoctorHeader';
import { getDoctorProfile } from '@/features/doctor/services/doctorProfileService';
import type { DoctorProfile } from '@/features/doctor/types/doctorProfile.types';
import { ProfileInfoCard } from '@/features/patient/components/ProfileInfoCard';

export function DoctorProfileScreen() {
  const { signOut } = useAuth();
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setProfile(await getDoctorProfile());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el perfil médico.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <LoadingState label="Cargando perfil médico..." />;

  const name = profile?.full_name ?? profile?.nombre_completo;
  const role = typeof profile?.role === 'object' ? profile.role.nombre : profile?.role_nombre ?? 'Médico';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => load(true)} refreshing={refreshing} />}
        showsVerticalScrollIndicator={false}>
        <DoctorHeader doctorName={name} specialty={profile?.specialty_name ?? profile?.especialidad_nombre} title="Perfil médico" />
        {error ? (
          <ErrorState message={error} onRetry={() => load()} title="No se pudo cargar el perfil" />
        ) : (
          <>
            <ProfileInfoCard
              items={[
                { label: 'Nombre', value: name },
                { label: 'Correo', value: profile?.email },
                { label: 'Teléfono', value: profile?.phone ?? profile?.telefono },
                { label: 'Especialidad', value: profile?.specialty_name ?? profile?.especialidad_nombre },
                { label: 'Clínica', value: profile?.clinic_name ?? profile?.clinica_nombre },
                { label: 'Rol', value: role },
              ]}
              title="Información profesional"
            />
            <AppButton label="Cerrar sesión" onPress={signOut} variant="danger" />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 22, paddingBottom: 34 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
});
