import { useNavigation, useRoute } from '@react-navigation/native';
import { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { colors } from '@/core/theme/colors';
import { useAuth } from '@/features/auth/context/AuthContext';
import { DoctorInfoCard, LogoutButton } from '@/features/doctor/components/DoctorProfileCards';
import { DoctorHeader } from '@/features/doctor/components/DoctorHeader';
import type { DoctorProfile } from '@/features/doctor/types/doctorProfile.types';

export function DoctorSecurityScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { signOut, user } = useAuth();
  const params = useMemo(() => (route.params ?? {}) as { profile?: DoctorProfile }, [route.params]);
  const profile = params.profile ?? {
    email: user?.email,
    full_name: user?.nombre_completo,
    is_active: user?.is_active,
    role_nombre: user?.role_nombre,
    telefono: user?.telefono,
  };

  async function closeSession() {
    await signOut();
    Alert.alert('Sesión cerrada', 'Sesión cerrada correctamente.');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <DoctorHeader title="Seguridad" />
        <DoctorInfoCard profile={profile} />
        <AppButton label="Cambiar contraseña" onPress={() => navigation.navigate('DoctorChangePassword')} />
        <LogoutButton onConfirm={closeSession} />
        <AppButton label="Volver" onPress={() => navigation.goBack()} variant="secondary" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 22, paddingBottom: 128 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
});
