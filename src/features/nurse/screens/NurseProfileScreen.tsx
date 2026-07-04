import { useNavigation } from '@react-navigation/native';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { QuickActionCard } from '@/components/QuickActionCard';
import { colors } from '@/core/theme/colors';
import { useAuth } from '@/features/auth/context/AuthContext';

export function NurseProfileScreen() {
  const navigation = useNavigation<any>();
  const { signOut, user } = useAuth();
  const clinic = typeof user?.clinica === 'object' ? user.clinica?.nombre : user?.clinica_nombre;

  function confirmLogout() {
    Alert.alert('Cerrar sesión', '¿Deseas cerrar tu sesión de MediCore?', [
      { style: 'cancel', text: 'Cancelar' },
      { style: 'destructive', text: 'Cerrar sesión', onPress: () => void signOut() },
    ]);
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeader icon="account-heart-outline" subtitle="Datos de acceso y configuración personal." title="Perfil enfermería" />
        <AppCard style={styles.profile}>
          <Text style={styles.name}>{user?.nombre_completo || user?.email || 'Personal de enfermería'}</Text>
          <Text style={styles.meta}>{user?.email}</Text>
          <Text style={styles.label}>Teléfono</Text>
          <Text style={styles.value}>{user?.telefono || 'No registrado'}</Text>
          <Text style={styles.label}>Clínica</Text>
          <Text style={styles.value}>{clinic || 'No asignada'}</Text>
          <Text style={styles.label}>Rol</Text>
          <Text style={styles.value}>Enfermería</Text>
        </AppCard>
        <QuickActionCard
          description="Revisa alertas, avisos y pacientes asignados."
          icon="bell-outline"
          onPress={() => navigation.navigate('NurseNotifications')}
          title="Notificaciónes"
        />
        <QuickActionCard
          description="Opciones de seguridad de la cuenta."
          icon="shield-account-outline"
          onPress={() => navigation.navigate('NurseSecurity')}
          title="Seguridad"
        />
        <AppButton label="Cerrar sesión" onPress={confirmLogout} variant="danger" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    padding: 18,
    paddingBottom: 110,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 10,
    textTransform: 'uppercase',
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
  },
  name: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '900',
  },
  profile: {
    gap: 4,
  },
  safe: {
    backgroundColor: colors.background,
    flex: 1,
  },
  value: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
});
