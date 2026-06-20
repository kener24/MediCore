import { useNavigation } from '@react-navigation/native';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { colors } from '@/core/theme/colors';
import { useAuth } from '@/features/auth/context/AuthContext';

export function ReceptionSecurityScreen() {
  const navigation = useNavigation<any>();
  const { role, signOut, user } = useAuth();

  function logout() {
    Alert.alert('Cerrar sesion', 'Deseas cerrar la sesion?', [
      { style: 'cancel', text: 'Cancelar' },
      { style: 'destructive', text: 'Cerrar sesion', onPress: () => void signOut() },
    ]);
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeader icon="shield-lock-outline" subtitle="Sesion, permisos y acciones seguras." title="Seguridad recepcion" />
        <AppCard style={styles.card}>
          <Text style={styles.title}>Sesion activa</Text>
          <Text style={styles.text}>Correo: {user?.email ?? 'No registrado'}</Text>
          <Text style={styles.text}>Rol: {String(role ?? 'recepcionista')}</Text>
          <Text style={styles.text}>Clinica: {user?.clinica_nombre ?? (typeof user?.clinica === 'object' ? user.clinica?.nombre ?? 'No asignada' : 'No asignada')}</Text>
        </AppCard>
        <AppCard style={styles.card}>
          <Text style={styles.title}>Permisos</Text>
          <Text style={styles.text}>Recepcion puede buscar pacientes, crear admisiones, hacer check-in y revisar visitas operativas de su clinica.</Text>
          <Text style={styles.text}>No registra signos vitales, consultas medicas, medicamentos, notas clinicas profundas ni altas hospitalarias.</Text>
          <Text style={styles.text}>Si el servidor responde 401, se limpia la sesion y se vuelve al login.</Text>
        </AppCard>
        <AppButton label="Cambiar contrasena" onPress={() => navigation.navigate('ReceptionChangePassword')} />
        <AppButton label="Volver al perfil" onPress={() => navigation.goBack()} variant="secondary" />
        <AppButton label="Cerrar sesion" onPress={logout} variant="danger" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  content: { gap: 14, padding: 18, paddingBottom: 120 },
  safe: { backgroundColor: colors.background, flex: 1 },
  text: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  title: { color: colors.ink, fontSize: 17, fontWeight: '900' },
});
