import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { useAuth } from '@/features/auth/context/AuthContext';
import { DoctorHeader } from '@/features/doctor/components/DoctorHeader';
import {
  DoctorActivitySummaryCard,
  DoctorClinicInfoCard,
  DoctorInfoCard,
  DoctorProfessionalInfoCard,
  DoctorProfileHeader,
  DoctorProfileMenu,
  DoctorScheduleCard,
  LogoutButton,
  doctorName,
} from '@/features/doctor/components/DoctorProfileCards';
import {
  getDoctorActivitySummary,
  getDoctorProfile,
  getDoctorSchedule,
  mapDoctorProfileResponse,
} from '@/features/doctor/services/doctorProfileService';
import type { DoctorActivitySummary, DoctorProfile, DoctorScheduleItem } from '@/features/doctor/types/doctorProfile.types';

export function DoctorProfileScreen() {
  const navigation = useNavigation<any>();
  const { signOut, user } = useAuth();
  const [profile, setProfile] = useState<DoctorProfile | null>(() => user ? mapDoctorProfileResponse(user) : null);
  const [schedules, setSchedules] = useState<DoctorScheduleItem[]>([]);
  const [activity, setActivity] = useState<DoctorActivitySummary | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [nextProfile, nextSchedules, nextActivity] = await Promise.all([
        getDoctorProfile(),
        getDoctorSchedule(),
        getDoctorActivitySummary(),
      ]);
      setProfile(nextProfile);
      setSchedules(nextSchedules.length ? nextSchedules : nextProfile.schedules ?? []);
      setActivity(nextActivity);
    } catch (err) {
      if (user) {
        setProfile(mapDoctorProfileResponse(user));
        setError('');
      } else {
        setError(err instanceof Error ? err.message : 'No se pudo cargar el perfil médico.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function confirmLogout() {
    await signOut();
    Alert.alert('Sesión cerrada', 'Sesión cerrada correctamente.');
  }

  if (loading) return <LoadingState label="Cargando perfil médico..." />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => load(true)} refreshing={refreshing} />}
        showsVerticalScrollIndicator={false}>
        <DoctorHeader doctorName={profile ? doctorName(profile) : undefined} title="Perfil médico" />
        {error ? (
          <ErrorState message={error} onRetry={() => load()} title="No se pudo cargar el perfil" />
        ) : profile ? (
          <>
            <DoctorProfileHeader profile={profile} />
            <DoctorInfoCard profile={profile} />
            <DoctorProfessionalInfoCard professional={profile.professional} profile={profile} />
            <DoctorClinicInfoCard clinic={typeof profile.clinic === 'object' ? profile.clinic : null} profile={profile} />
            <DoctorScheduleCard schedules={schedules} />
            <DoctorActivitySummaryCard summary={activity} />
            <DoctorProfileMenu
              onChangePassword={() => navigation.navigate('DoctorChangePassword')}
              onEdit={() => navigation.navigate('DoctorEditProfile', { profile })}
              onLogout={() => Alert.alert('Cerrar sesión', '¿Deseas cerrar sesión?', [
                { style: 'cancel', text: 'Cancelar' },
                { onPress: confirmLogout, style: 'destructive', text: 'Cerrar sesión' },
              ])}
              onSchedule={() => navigation.navigate('DoctorScheduleProfile', { schedules })}
              onSecurity={() => navigation.navigate('DoctorSecurity', { profile })}
            />
            <LogoutButton onConfirm={confirmLogout} />
          </>
        ) : (
          <EmptyState title="Perfil no disponible" description="Esta información no está disponible por el momento." />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 22, paddingBottom: 128 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
});
