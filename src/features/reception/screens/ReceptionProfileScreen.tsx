import { useNavigation } from '@react-navigation/native';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { colors } from '@/core/theme/colors';
import { useAuth } from '@/features/auth/context/AuthContext';

export function ReceptionProfileScreen() {
  const navigation = useNavigation<any>();
  const { role, signOut, user } = useAuth();

  async function logout() {
    Alert.alert('Cerrar sesión', '¿Deseas cerrar la sesión?', [
      { style: 'cancel', text: 'Cancelar' },
      { style: 'destructive', text: 'Cerrar sesión', onPress: () => void signOut() },
    ]);
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeader icon="account-cog-outline" subtitle="Perfil operativo de recepción." title="Perfil" />
        <AppCard style={styles.card}>
          <Text style={styles.title}>{user?.nombre_completo ?? 'Recepción'}</Text>
          <Info label="Correo" value={user?.email ?? 'No registrado'} />
          <Info label="Rol" value={String(role ?? 'recepcionista')} />
          <Info label="Clínica" value={user?.clinica_nombre ?? (typeof user?.clinica === 'object' ? user.clinica?.nombre ?? 'No asignada' : 'No asignada')} />
          <Info label="Teléfono" value={user?.telefono ?? 'No registrado'} />
          <Info label="Estado" value={user?.is_active ? 'Activo' : 'Inactivo'} />
        </AppCard>
        <AppButton label="Seguridad" onPress={() => navigation.navigate('ReceptionSecurity')} variant="secondary" />
        <AppButton label="Cerrar sesión" onPress={logout} variant="danger" />
      </ScrollView>
    </SafeAreaView>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <Text style={styles.meta}>{label}: {value}</Text>;
}

const styles = StyleSheet.create({
  card: { gap: 7 },
  content: { gap: 14, padding: 18, paddingBottom: 120 },
  meta: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  safe: { backgroundColor: colors.background, flex: 1 },
  title: { color: colors.ink, fontSize: 20, fontWeight: '900' },
});
