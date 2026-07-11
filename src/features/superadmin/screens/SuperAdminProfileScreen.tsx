import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { RoleGuard } from '@/components/RoleGuard';
import { colors } from '@/core/theme/colors';
import { useAuth } from '@/features/auth/context/AuthContext';

export function SuperAdminProfileScreen() {
  const { signOut, user } = useAuth();
  const confirmLogout = () => {
    Alert.alert('Cerrar sesión', '¿Deseas salir del panel superadmin?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', onPress: () => void signOut(), style: 'destructive' },
    ]);
  };

  return (
    <RoleGuard roles={['superadmin']}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <AppHeader icon="shield-key-outline" subtitle="Cuenta de control global." title="Perfil superadmin" />
          <AppCard style={styles.card}>
            <Text style={styles.name}>{user?.nombre_completo || 'Super Administrador'}</Text>
            <Text style={styles.meta}>{user?.email}</Text>
            <Text style={styles.meta}>Rol: superadmin</Text>
          </AppCard>
          <AppCard style={styles.card}>
            <Text style={styles.title}>Seguridad</Text>
            <Text style={styles.meta}>Usa esta app para control ejecutivo. Cambios delicados de configuración global deben validarse también desde el panel web.</Text>
          </AppCard>
          <AppButton label="Cerrar sesión" onPress={confirmLogout} variant="danger" />
        </ScrollView>
      </SafeAreaView>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 7 },
  content: { gap: 16, padding: 18, paddingBottom: 120 },
  meta: { color: colors.muted, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  name: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  safe: { backgroundColor: colors.background, flex: 1 },
  title: { color: colors.ink, fontSize: 16, fontWeight: '900' },
});

