import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';
import { useAuth } from '@/features/auth/context/AuthContext';
import { ConfirmLogoutModal } from '@/features/patient/components/ConfirmLogoutModal';
import { PatientHeader } from '@/features/patient/components/PatientHeader';
import { SettingsOption } from '@/features/patient/components/SettingsOption';

export function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { signOut } = useAuth();
  const [logoutVisible, setLogoutVisible] = useState(false);

  async function confirmLogout() {
    setLogoutVisible(false);
    await signOut();
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PatientHeader subtitle="Gestiona tu cuenta y preferencias." title="Configuracion" />
        <AppCard style={styles.options}>
          <SettingsOption
            icon="account-circle-outline"
            onPress={() => navigation.navigate('PatientProfile')}
            subtitle="Consulta tus datos personales"
            title="Mi perfil"
          />
          <SettingsOption
            icon="lock-reset"
            onPress={() => navigation.navigate('ChangePassword')}
            subtitle="Actualiza tu contrasena"
            title="Cambiar contrasena"
          />
          <SettingsOption
            icon="hospital-building"
            onPress={() => navigation.navigate('ClinicInfo')}
            subtitle="Telefono, correo y horarios"
            title="Informacion de clinica"
          />
          <SettingsOption
            icon="bell-outline"
            onPress={() => navigation.navigate('PatientNotifications')}
            subtitle="Avisos y mensajes del portal"
            title="Notificaciones"
          />
          <SettingsOption
            danger
            icon="logout"
            onPress={() => setLogoutVisible(true)}
            subtitle="Finaliza tu sesion en este dispositivo"
            title="Cerrar sesion"
          />
        </AppCard>
      </ScrollView>
      <ConfirmLogoutModal
        onCancel={() => setLogoutVisible(false)}
        onConfirm={confirmLogout}
        visible={logoutVisible}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 22, paddingBottom: 34 },
  options: { gap: 0, paddingVertical: 4 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
});
